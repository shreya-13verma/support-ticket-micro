export type UserRole = 'user' | 'agent' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed';

export interface Ticket {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_by: number;
  assigned_to: number | null;
  due_at: string | null;
  resolved_at: string | null;
  sla_breached: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  ticket_id: number;
  author_id: number;
  author_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface Attachment {
  id: number;
  ticket_id: number;
  uploaded_by: number;
  filename: string;
  file_path: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

export interface SLAPolicy {
  id: number;
  priority: TicketPriority;
  response_time_hours: number;
  resolution_time_hours: number;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  ticket_id: number | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SLAComplianceStats {
  total_tickets: number;
  breached_tickets: number;
  compliant_tickets: number;
  compliance_rate_percentage: number;
}

export interface AgentMetric {
  agent_id: number;
  assigned_count: number;
  resolved_count: number;
  avg_resolution_hours: number;
}

export * from './docs';

