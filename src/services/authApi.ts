export type ApiResponse<T = unknown> = {
  success: boolean;
  data: T;
  code?: string;
  msg?: string;
  message?: string;
};

export type AuthUser = {
  id: number;
  provider?: string | null;
  providerUserId?: string | null;
  email?: string | null;
  name?: string | null;
  realName?: string | null;
  username?: string | null;
  phone?: string | null;
  role?: string | null;
  status?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AuthSession = {
  user: AuthUser;
  token: string;
  tokenType?: string;
  expiresIn?: number;
};

export type RegisterPayload = {
  email: string;
  realName: string;
  username: string;
  password: string;
  phone: string;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type AdminPasswordResetPayload = {
  userId?: number | null;
  identifier?: string;
  newPassword?: string;
};

export type AdminPasswordResetResult = {
  user: AuthUser;
  temporaryPassword: string | null;
};

const DEFAULT_AUTH_API_PATH = "/api/user";

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function getAuthApiBaseUrl() {
  const authApiBaseUrl = import.meta.env.VITE_AUTH_API_BASE_URL;

  if (authApiBaseUrl) {
    return authApiBaseUrl;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (apiBaseUrl) {
    return joinUrl(apiBaseUrl, DEFAULT_AUTH_API_PATH);
  }

  const legacyAuthUrl = import.meta.env.VITE_AUTH_VALIDATE_URL;

  if (legacyAuthUrl) {
    try {
      return joinUrl(new URL(legacyAuthUrl).origin, DEFAULT_AUTH_API_PATH);
    } catch {
      return joinUrl(legacyAuthUrl, DEFAULT_AUTH_API_PATH);
    }
  }

  return DEFAULT_AUTH_API_PATH;
}

const AUTH_API_BASE = getAuthApiBaseUrl();

function getMessage(result: ApiResponse<unknown>, fallback: string) {
  return result.message || result.msg || fallback;
}

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return {
      success: response.ok,
      data: null as T,
      msg: response.ok ? "" : `HTTP ${response.status}`,
    };
  }

  return response.json() as Promise<ApiResponse<T>>;
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const result = await readApiResponse<T>(response);

  if (!response.ok || !result.success) {
    throw new Error(getMessage(result, `요청에 실패했습니다. HTTP ${response.status}`));
  }

  return result.data;
}

export async function registerUser(payload: RegisterPayload) {
  return requestJson<AuthSession>(joinUrl(AUTH_API_BASE, "/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: payload.email,
      real_name: payload.realName,
      username: payload.username,
      password: payload.password,
      phone: payload.phone,
    }),
  });
}

export async function loginUser(payload: LoginPayload) {
  return requestJson<AuthSession>(joinUrl(AUTH_API_BASE, "/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(token: string | null) {
  if (!token) {
    throw new Error("토큰이 없습니다.");
  }

  return requestJson<AuthUser>(joinUrl(AUTH_API_BASE, "/me"), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getAdminUsers(token: string | null, q = "") {
  if (!token) {
    throw new Error("로그인이 필요합니다.");
  }

  const params = new URLSearchParams();
  const keyword = q.trim();
  if (keyword) {
    params.set("q", keyword);
  }

  const queryString = params.toString();
  return requestJson<AuthUser[]>(
    joinUrl(AUTH_API_BASE, `/admin/users${queryString ? `?${queryString}` : ""}`),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export async function adminResetPassword(
  token: string | null,
  payload: AdminPasswordResetPayload
) {
  if (!token) {
    throw new Error("로그인이 필요합니다.");
  }

  return requestJson<AdminPasswordResetResult>(
    joinUrl(AUTH_API_BASE, "/admin/password-reset"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: payload.userId || undefined,
        identifier: payload.identifier?.trim() || undefined,
        newPassword: payload.newPassword || undefined,
      }),
    }
  );
}

export async function validateAuthToken(
  token: string | null
): Promise<ApiResponse<AuthUser | null>> {
  if (!token) {
    return { success: false, data: null, msg: "Token is missing." };
  }

  try {
    const user = await getCurrentUser(token);

    return {
      success: true,
      data: user,
      msg: "",
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      msg: error instanceof Error ? error.message : "Failed to validate auth token.",
    };
  }
}
