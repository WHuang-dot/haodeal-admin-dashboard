/**
 * Global type definitions for Admin Dashboard
 */

export type UserRole = "viewer" | "operator" | "admin";

export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  ok: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ListParams {
  limit?: number;
  offset?: number;
  sort?: string;
  order?: "asc" | "desc";
  filters?: Record<string, string | string[]>;
}

export interface ListResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  target_table: string;
  target_id: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  created_at: string;
}

export interface PipelineSummary {
  scanned: number;
  processed: number;
  skipped: number;
  failed: number;
  errors: string[];
}
