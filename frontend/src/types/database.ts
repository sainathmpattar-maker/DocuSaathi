/**
 * types/database.ts
 *
 * TypeScript type definitions matching the Supabase database schema.
 * These are manually maintained — in future phases you can auto-generate
 * them with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
 */

export type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'failed';
export type ValidationSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ValidationStatus = 'open' | 'acknowledged' | 'resolved';
export type DeadlinePriority = 'low' | 'medium' | 'high' | 'critical';
export type ChatRole = 'user' | 'assistant';

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  document_type: string | null;
  status: DocumentStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface Extraction {
  id: string;
  document_id: string;
  field_name: string;
  field_value: string | null;
  confidence: number | null;
  created_at: string;
}

export interface ValidationResult {
  id: string;
  document_id: string;
  severity: ValidationSeverity;
  title: string;
  description: string | null;
  status: ValidationStatus;
  created_at: string;
}

export interface Deadline {
  id: string;
  document_id: string;
  title: string;
  due_date: string | null; // ISO date string YYYY-MM-DD
  priority: DeadlinePriority;
  completed: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  document_id: string;
  user_id: string;
  role: ChatRole;
  message: string;
  created_at: string;
}

/**
 * Supabase Database type for use with createClient<Database>().
 * Extend this as tables are added or columns change.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Document, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      extractions: {
        Row: Extraction;
        Insert: Omit<Extraction, 'id' | 'created_at'>;
        Update: Partial<Omit<Extraction, 'id' | 'document_id' | 'created_at'>>;
      };
      validation_results: {
        Row: ValidationResult;
        Insert: Omit<ValidationResult, 'id' | 'created_at'>;
        Update: Partial<Omit<ValidationResult, 'id' | 'document_id' | 'created_at'>>;
      };
      deadlines: {
        Row: Deadline;
        Insert: Omit<Deadline, 'id' | 'created_at'>;
        Update: Partial<Omit<Deadline, 'id' | 'document_id' | 'created_at'>>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'id' | 'created_at'>;
        Update: never; // chat messages are immutable
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
