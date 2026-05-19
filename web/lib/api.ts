const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export type LoginResponse = {
  access_token: string;
  token_type?: string;
};

type ApiOptions = RequestInit & {
  skipAuthRedirect?: boolean;
};

function getLanguage() {
  return typeof window !== "undefined"
    ? localStorage.getItem("language") || "en"
    : "en";
}

export function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

export function saveToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token.trim());
  }
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
}

export function logout() {
  removeToken();

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

async function parseResponse(response: Response) {
  if (response.status === 204) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(errorData: any, fallback: string, language: string) {
  if (typeof errorData?.detail === "string") {
    return errorData.detail;
  }

  if (Array.isArray(errorData?.detail)) {
    return language === "tr"
      ? "Gönderilen bilgiler geçersiz."
      : "Submitted data is invalid.";
  }

  if (typeof errorData?.message === "string") {
    return errorData.message;
  }

  return fallback;
}

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const token = getToken();
  const language = getLanguage();
  const { skipAuthRedirect, ...fetchOptions } = options;

  if (!API_BASE_URL) {
    throw new Error(
      language === "tr"
        ? "API adresi tanımlı değil. .env.local dosyasını kontrol et."
        : "API base URL is missing. Check your .env.local file."
    );
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": language,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fetchOptions.headers || {}),
    },
  });

  const data = await parseResponse(response);

  if (response.status === 401) {
    if (!skipAuthRedirect) {
      removeToken();
    }

    throw new Error(language === "tr" ? "Oturum süresi doldu." : "Unauthorized");
  }

  if (!response.ok) {
    const fallback =
      language === "tr" ? "Bir hata oluştu." : `API request failed: ${response.status}`;

    throw new Error(getErrorMessage(data, fallback, language));
  }

  return data;
}

export async function login(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  const language = getLanguage();

  removeToken();

  if (!API_BASE_URL) {
    throw new Error(
      language === "tr"
        ? "API adresi tanımlı değil. .env.local dosyasını kontrol et."
        : "API base URL is missing. Check your .env.local file."
    );
  }

  async function tryFormLogin() {
    const formData = new URLSearchParams();
    formData.append("username", cleanEmail);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Language": language,
      },
      body: formData.toString(),
    });

    const data = await parseResponse(response);
    console.log("LOGIN FORM STATUS:", response.status, data);
    return { response, data };
  }

  async function tryJsonLogin() {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": language,
      },
      body: JSON.stringify({
        email: cleanEmail,
        password,
      }),
    });

    const data = await parseResponse(response);
    console.log("LOGIN JSON STATUS:", response.status, data);
    return { response, data };
  }

  let { response, data } = await tryFormLogin();

  if (!response.ok) {
    const fallback = await tryJsonLogin();
    response = fallback.response;
    data = fallback.data;
  }

  if (!response.ok) {
    const fallback = language === "tr" ? "Giriş başarısız." : "Login failed.";
    throw new Error(getErrorMessage(data, fallback, language));
  }

  if (!data?.access_token) {
    throw new Error(language === "tr" ? "Token alınamadı." : "Token could not be retrieved.");
  }

  saveToken(data.access_token);
  console.log("TOKEN SAVED:", Boolean(getToken()));
  return data as LoginResponse;
}

export async function resendVerification(email: string) {
  return apiFetch("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
    skipAuthRedirect: true,
  });
}