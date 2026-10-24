export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>;
}

export class ApiError extends Error {
  public status: number;
  public errors?: Record<string, string>;
  public isNetworkError: boolean;

  constructor(message: string, status = 500, errors?: Record<string, string>, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.isNetworkError = isNetworkError;
  }
}

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  return url.replace(/\/+$/, '');
};

/**
 * Universal fetch wrapper ensuring cross-origin credentials (HTTP-only cookies)
 * and structured error normalization.
 */
async function request<T>(endpoint: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const url = `${getBaseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(url, {
      ...init,
      headers,
      credentials: 'include', // Guarantees HTTP-only cookies are included
    });

    let data: ApiResponse<T>;
    try {
      data = await res.json();
    } catch {
      data = {
        success: res.ok,
        message: res.statusText || 'Unexpected server response format',
      };
    }

    if (!res.ok) {
      throw new ApiError(
        data.message || 'Request failed',
        res.status,
        data.errors
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network disconnection or server unreachable
    throw new ApiError(
      'Unable to connect to the server. Please verify your connection or ensure the API server is running.',
      0,
      undefined,
      true
    );
  }
}

export const api = {
  get: <T>(endpoint: string, init?: RequestInit) =>
    request<T>(endpoint, { ...init, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, init?: RequestInit) =>
    request<T>(endpoint, {
      ...init,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, init?: RequestInit) =>
    request<T>(endpoint, {
      ...init,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, init?: RequestInit) =>
    request<T>(endpoint, { ...init, method: 'DELETE' }),
};
