/**
 * ConsultaMed Frontend - API Client
 *
 * Cliente para comunicacion con el backend FastAPI.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ResponseMode = "json" | "blob";

/**
 * Error de respuesta del backend con su código HTTP.
 *
 * Permite distinguir un rechazo de credenciales (401/403) de una caída de red,
 * que no debe cerrar la sesión del usuario.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ValidationIssue {
  loc?: unknown[];
  msg?: string;
}

/**
 * Extrae un mensaje legible del cuerpo de error del backend.
 *
 * FastAPI devuelve `detail` como texto para los errores de negocio, pero como
 * lista de incidencias en los 422 de validación; sin este caso los formularios
 * mostraban "[object Object]".
 */
function extractErrorDetail(payload: unknown): string {
  const fallback = "Error desconocido";

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const detail = (payload as { detail?: unknown }).detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = (detail as ValidationIssue[])
      .map((issue) => {
        const field = Array.isArray(issue.loc) ? issue.loc[issue.loc.length - 1] : undefined;
        return field ? `${String(field)}: ${issue.msg ?? ""}`.trim() : issue.msg;
      })
      .filter((message): message is string => Boolean(message));

    if (messages.length > 0) {
      return messages.join(" · ");
    }
  }

  return fallback;
}

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
    const payload = await response.json().catch(() => null);
    throw new ApiError(extractErrorDetail(payload), response.status);
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
