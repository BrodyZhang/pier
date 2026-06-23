import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    role?: 'user' | 'admin';
    userEmail?: string;
    userName?: string;
  }
}

export type AgentStatus = 'pending_review' | 'in_development' | 'dev_review' | 'completed' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  registration_date: string;
  created_at: string;
  last_login_at: string | null;
}

export interface AgentRequest {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: AgentStatus;
  rejection_reason: string | null;
  review_notes: string | null;
  review_comments: string | null;
  review_log: ReviewLogEntry[];
  unique_slug: string | null;
  parent_id: string | null;
  version_number: number;
  showcased: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentRequestWithUser extends AgentRequest {
  user_email?: string;
  creator_email?: string;
  parent_name?: string | null;
  parent_slug?: string | null;
  share_count?: number;
}

export interface ReviewLogEntry {
  action: string;
  notes?: string | null;
  comments?: string | null;
  reason?: string | null;
  timestamp: string;
}

export interface AgentVersion {
  id: string;
  agent_id: string;
  version_number: number;
  request_description: string;
  html_file_path: string | null;
  created_at: string;
}

export interface AgentFile {
  id: number;
  agent_id: string;
  content: string;
  created_at: string;
}

export interface AgentShare {
  id: string;
  agent_id: string;
  partner_email: string;
  partner_user_id: string | null;
  created_at: string;
}

export interface VerificationCode {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface CreateAgentDTO {
  name: string;
  description: string;
  user_id: string;
}

export interface UpdateAgentDTO {
  name?: string;
  description?: string;
}

export interface AgentFileContent {
  html: string;
  base64?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
