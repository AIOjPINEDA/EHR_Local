/**
 * ConsultaMed Frontend - API Client
 * 
 * Cliente para comunicación con el backend FastAPI.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiError {
  detail: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Centralized error handler for all API responses.
   * Parses error.detail from backend or returns fallback message.
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Error desconocido',
    }));
    throw new Error(error.detail);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async postForm<T>(endpoint: string, formData: URLSearchParams): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData.toString(),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.json();
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Download PDF as blob
  async downloadPdf(endpoint: string): Promise<Blob> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return response.blob();
  }
}

export const api = new ApiClient(API_BASE_URL);
