export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ServerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  game?: string;
}

export interface CommandRequest {
  serverId: string;
  command: string;
  args?: string[];
}

export interface ConfigRequest {
  serverId: string;
  configType: "lgsm" | "game" | "secrets";
  key: string;
  value: string;
}

export interface BackupRequest {
  serverId: string;
  name?: string;
}

export interface AlertTestRequest {
  serverId: string;
  channel: string;
}
