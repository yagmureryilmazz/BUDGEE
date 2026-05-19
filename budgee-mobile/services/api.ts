import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT = 10000;

export async function getToken() {
  return AsyncStorage.getItem("token");
}

export async function saveToken(token: string) {
  return AsyncStorage.setItem("token", token);
}

export async function removeToken() {
  return AsyncStorage.removeItem("token");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  withAuth = false
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const token = withAuth ? await getToken() : null;

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.detail || data?.message || "REQUEST_FAILED");
    }

    return data as T;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("REQUEST_TIMEOUT");
    }

    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function apiGet<T>(endpoint: string) {
  return request<T>(endpoint, { method: "GET" }, true);
}

export function apiPost<T>(endpoint: string, body: unknown, withAuth = false) {
  return request<T>(
    endpoint,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    withAuth
  );
}

export function apiPatch<T>(endpoint: string, body: unknown) {
  return request<T>(
    endpoint,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
    true
  );
}

export function apiDelete<T>(endpoint: string) {
  return request<T>(endpoint, { method: "DELETE" }, true);
}