export type ApiResponse<T = unknown> = {
  success: boolean;
  data: T;
  msg: string;
};

const DEFAULT_AUTH_VALIDATE_PATH = "/auth/validate";

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function getAuthValidateUrl() {
  const validateUrl = import.meta.env.VITE_AUTH_VALIDATE_URL;

  if (validateUrl) {
    return validateUrl;
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (baseUrl) {
    return joinUrl(baseUrl, DEFAULT_AUTH_VALIDATE_PATH);
  }

  return "";
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

export async function validateAuthToken<T = unknown>(
  token: string | null
): Promise<ApiResponse<T | null>> {
  if (!token) {
    return { success: false, data: null, msg: "Token is missing." };
  }

  const validateUrl = getAuthValidateUrl();

  if (!validateUrl) {
    return {
      success: false,
      data: null,
      msg: "Auth token validation URL is not configured.",
    };
  }

  try {
    const response = await fetch(validateUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    const result = await readApiResponse<T>(response);

    return {
      success: response.ok && result.success,
      data: result.data ?? null,
      msg: result.msg ?? "",
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      msg: error instanceof Error ? error.message : "Failed to validate auth token.",
    };
  }
}
