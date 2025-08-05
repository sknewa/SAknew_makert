// API response types for better type safety

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface ErrorResponse {
  detail?: string;
  code?: string;
  messages?: Array<{
    message: string;
    token_class?: string;
    token_type?: string;
  }>;
  [key: string]: any; // For field-specific errors
}

// Common API parameters
export interface PaginationParams {
  page?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  ordering?: string; // Field name with optional - prefix for descending
}

export interface FilterParams {
  search?: string;
  [key: string]: any; // Additional filters
}