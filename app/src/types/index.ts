import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    role?: 'user' | 'admin';
    userEmail?: string;
    userName?: string;
  }
}

export interface User {
  id: string;
  email: string;
  name?: string;
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
  status: 'pending_review' | 'in_development' | 'completed' | 'rejected';
  rejection_reason: string | null;
  unique_slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentVersion {
  id: string;
  agent_id: string;
  version_number: number;
  request_description: string;
  html_file_path: string | null;
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
