const ACCESS_TOKEN_KEY = "argus.access_token";
const REFRESH_TOKEN_KEY = "argus.refresh_token";

type ApiEnvelope<T> = {
  status?: boolean | "success";
  data?: T;
  message?: string;
  error?: string | { message?: string; code?: string };
  detail?: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  role?: string;
};

let refreshRequest: Promise<boolean> | null = null;

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const value = payload as ApiEnvelope<unknown>;
  if (typeof value.error === "string") return value.error;
  if (value.error && typeof value.error.message === "string") return value.error.message;
  if (typeof value.message === "string") return value.message;
  if (typeof value.detail === "string") return value.detail;
  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: response.statusText || "请求失败，请稍后重试。" };
  }
}

async function refreshTokens(baseUrl: string) {
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const payload = await readJson(response) as ApiEnvelope<TokenResponse>;
  if (!response.ok || !payload.data?.access_token || !payload.data.refresh_token) return false;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, payload.data.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, payload.data.refresh_token);
  if (payload.data.role) window.localStorage.setItem("argus.role", payload.data.role);
  window.dispatchEvent(new Event("argus:auth-refreshed"));
  return true;
}

function recoverAuth(baseUrl: string) {
  refreshRequest ??= refreshTokens(baseUrl).finally(() => {
    refreshRequest = null;
  });
  return refreshRequest;
}

export async function requestArgusJson<T>(
  baseUrl: string,
  pathname: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const url = `${baseUrl.replace(/\/$/, "")}/${pathname.replace(/^\//, "")}`;
  const send = () => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) throw new Error("登录状态已失效，请先在管理端登录，并确保用户端与管理端使用同一域名。");
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
  };

  let response = await send();
  let payload = await readJson(response) as ApiEnvelope<T>;
  if (response.status === 401 && await recoverAuth(baseUrl)) {
    response = await send();
    payload = await readJson(response) as ApiEnvelope<T>;
  }
  if (!response.ok || (payload.status !== true && payload.status !== "success")) {
    if (response.status === 401) {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.dispatchEvent(new Event("argus:auth-invalid"));
    }
    throw new Error(getErrorMessage(payload, `服务返回 ${response.status}，请稍后重试。`));
  }
  if (payload.data == null) throw new Error("服务未返回结果，请重新读取状态。");
  return payload.data;
}
