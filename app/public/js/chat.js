(function() {
  var root = document.getElementById('pier-chat-root');
  if (!root) return;

  var slug = root.getAttribute('data-slug');
  var userEmail = root.getAttribute('data-email') || '';
  var userName = root.getAttribute('data-name') || userEmail || '游客';
  var wsUrl = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws?slug=' + encodeURIComponent(slug);
  var ws = null;
  var reconnectTimer = null;
  var trying = false;

  function connect() {
    if (trying || (ws && ws.readyState === WebSocket.OPEN)) return;
    trying = true;
    ws = new WebSocket(wsUrl);
    ws.onopen = function() {
      trying = false;
      addSystemMsg('已连接', 'success');
      ws.send(JSON.stringify({ type: 'join', userEmail: userEmail, userName: userName }));
    };
    ws.onmessage = function(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'users') {
          updateOnline(msg.count);
        } else if (msg.type === 'join') {
          addSystemMsg(msg.user + ' 加入了');
          if (msg.users) updateOnline(msg.users);
        } else if (msg.type === 'leave') {
          addSystemMsg(msg.user + ' 离开了');
          if (msg.users) updateOnline(msg.users);
        } else if (msg.type === 'message') {
          var d = new Date(msg.time);
          var t = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
          addChatMsg(msg.user, msg.text, t);
        } else if (msg.type === 'error') {
          addSystemMsg('⚠ ' + msg.message, 'error');
        }
      } catch (ex) {}
    };
    ws.onclose = function() {
      trying = false;
      addSystemMsg('连接断开，3秒后重连...', 'error');
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 3000);
    };
    ws.onerror = function() { trying = false; };
  }

  function updateOnline(n) {
    var el = document.getElementById('pier-chat-online');
    if (el) el.textContent = n + '人 ';
  }

  function addSystemMsg(text, type) {
    var el = document.getElementById('pier-chat-msgs');
    if (!el) return;
    var d = document.createElement('div');
    d.style.cssText = 'text-align:center;font-size:11px;padding:8px;color:' + (type === 'error' ? '#ff6b9d' : '#999') + ';';
    d.textContent = text;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  }

  function addChatMsg(user, text, time) {
    var el = document.getElementById('pier-chat-msgs');
    if (!el) return;
    var isMe = user === userName || user === '我';
    var d = document.createElement('div');
    d.className = 'pier-msg ' + (isMe ? 'pier-msg-me' : 'pier-msg-other');
    d.innerHTML = '<div class="bubble">' + escapeHtml(text) + '</div><div class="pier-msg-time">' + (isMe ? '我 ' : escapeHtml(user) + ' ') + time + '</div>';
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(s));
    return div.innerHTML;
  }

  window.onInputFocus = function() {
    var panel = document.getElementById('pier-chat-panel');
    if (panel && window.innerWidth <= 480) {
      panel.classList.add('keyboard');
    }
  };

  window.onInputBlur = function() {
    var panel = document.getElementById('pier-chat-panel');
    if (panel) panel.classList.remove('keyboard');
  };

  window.toggleChat = function() {
    var overlay = document.getElementById('pier-chat-overlay');
    var panel = document.getElementById('pier-chat-panel');
    var btn = document.getElementById('pier-chat-btn');
    if (overlay.style.display === 'flex') {
      panel.style.transform = 'translateY(100%)';
      setTimeout(function() { overlay.style.display = 'none'; }, 300);
      btn.style.display = 'flex';
    } else {
      overlay.style.display = 'flex';
      btn.style.display = 'none';
      setTimeout(function() { panel.style.transform = 'translateY(0)'; }, 10);
      document.getElementById('pier-chat-input').focus();
    }
  };

  window.sendChatMsg = function() {
    var input = document.getElementById('pier-chat-input');
    var text = input.value.trim();
    if (!text) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addSystemMsg('连接中，请稍候...', 'error');
      connect();
      return;
    }
    ws.send(JSON.stringify({ type: 'message', text: text }));
    input.value = '';
    input.style.height = '';
    input.focus();
  };

  connect();
})();
