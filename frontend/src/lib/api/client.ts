/**
 * ConsultaMed Frontend - API Client
 *
 * Cliente para comunicacion con el backend FastAPI.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiError {
  detail: string;
}

type ResponseMode = "json" | "blob";

interface ApiRequestOptions extends Omit<RequestInit, "headers"> {
  contentType?: string | null;
  headers?: HeadersInit;
  responseMode?: ResponseMode;
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

  private buildUrl(endpoint: string): string {
    return `${this.baseUrl}/api/v1${endpoint}`;
  }

  private buildHeaders(contentType: string | null, headers?: HeadersInit): Headers {
    const resolvedHeaders = new Headers(headers);

    if (contentType) {
      resolvedHeaders.set("Content-Type", contentType);
    }

    if (this.token) {
      resolvedHeaders.set("Authorization", `Bearer ${this.token}`);
    }

    return resolvedHeaders;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const error: ApiError = await response.json().catch(() => ({
      detail: "Error desconocido",
    }));
    throw new Error(error.detail);
  }

  private async parseResponse<T>(response: Response, responseMode: ResponseMode): Promise<T> {
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    if (responseMode === "blob") {
      return response.blob() as Promise<T>;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  private async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { contentType = "application/json", headers, responseMode = "json", ...requestInit } =
      options;

    const response = await fetch(this.buildUrl(endpoint), {
      ...requestInit,
      headers: this.buildHeaders(contentType, headers),
    });

    return this.parseResponse<T>(response, responseMode);
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async postForm<T>(endpoint: string, formData: URLSearchParams): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      contentType: "application/x-www-form-urlencoded",
      body: formData.toString(),
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  async downloadPdf(endpoint: string): Promise<Blob> {
    return this.request<Blob>(endpoint, {
      contentType: null,
      responseMode: "blob",
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
