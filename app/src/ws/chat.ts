import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

interface ChatClient {
  ws: WebSocket;
  userEmail: string;
  userName: string;
  lastMessageTime: number;
  messageCount: number;
  joinTime: number;
}

const rooms = new Map<string, Map<WebSocket, ChatClient>>();

const RATE_LIMIT = {
  messagesPerMinute: 30,
  minInterval: 3000,
  maxMessageLength: 500,
};

function broadcast(room: Map<WebSocket, ChatClient>, message: object, exclude: WebSocket | null) {
  const data = JSON.stringify(message);
  for (const [ws] of room) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function validateMessage(msg: any): { valid: boolean; error?: string } {
  if (!msg || typeof msg !== 'object') {
    return { valid: false, error: 'Invalid message format' };
  }

  if (msg.type === 'join') {
    if (msg.userEmail && typeof msg.userEmail === 'string' && msg.userEmail.length > 255) {
      return { valid: false, error: 'Email too long' };
    }
    if (msg.userName && typeof msg.userName === 'string' && msg.userName.length > 100) {
      return { valid: false, error: 'Username too long' };
    }
    return { valid: true };
  }

  if (msg.type === 'message') {
    if (!msg.text || typeof msg.text !== 'string') {
      return { valid: false, error: 'Message text required' };
    }
    if (msg.text.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }
    if (msg.text.length > RATE_LIMIT.maxMessageLength) {
      return { valid: false, error: `Message cannot exceed ${RATE_LIMIT.maxMessageLength} characters` };
    }
    return { valid: true };
  }

  return { valid: false, error: 'Unknown message type' };
}

export function setupWebSocket(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const slug = url.searchParams.get('slug');

    if (!slug || typeof slug !== 'string' || slug.length > 100) {
      ws.close(1008, 'Invalid slug');
      return;
    }

    if (!rooms.has(slug)) rooms.set(slug, new Map());
    const room = rooms.get(slug)!;

    if (room.size > 100) {
      ws.close(1013, 'Room is full');
      return;
    }

    const client: ChatClient = {
      ws,
      userEmail: '',
      userName: '',
      lastMessageTime: 0,
      messageCount: 0,
      joinTime: Date.now(),
    };
    room.set(ws, client);

    ws.send(JSON.stringify({ type: 'users', count: room.size }));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        const validation = validateMessage(msg);
        if (!validation.valid) {
          ws.send(JSON.stringify({ type: 'error', message: validation.error }));
          return;
        }

        if (msg.type === 'join') {
          client.userEmail = (msg.userEmail || 'Anonymous').substring(0, 255);
          client.userName = (msg.userName || client.userEmail).substring(0, 100);
          broadcast(room, { type: 'join', user: client.userName, users: room.size }, ws);
          return;
        }

        if (msg.type === 'message') {
          const now = Date.now();

          if (now - client.lastMessageTime < RATE_LIMIT.minInterval) {
            ws.send(JSON.stringify({ type: 'error', message: '消息发送太快，请等待 3 秒' }));
            return;
          }

          if (now - client.joinTime < 60000) {
            client.messageCount++;
            if (client.messageCount > RATE_LIMIT.messagesPerMinute) {
              ws.send(JSON.stringify({ type: 'error', message: '发送消息过于频繁，请稍后再试' }));
              return;
            }
          }

          client.lastMessageTime = now;

          const safeText = msg.text.substring(0, RATE_LIMIT.maxMessageLength);
          broadcast(room, { type: 'message', text: safeText, user: client.userName, time: now }, null);
          return;
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      const uname = client.userName;
      room.delete(ws);
      if (room.size === 0) rooms.delete(slug);
      else if (uname) broadcast(room, { type: 'leave', user: uname, users: room.size }, null);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      room.delete(ws);
    });
  });

  return wss;
}
