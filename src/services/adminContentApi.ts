export type ApiResult<T> = {
  success: boolean;
  data: T;
  code?: string;
  msg?: string;
  message?: string;
};

export type NoticeFile = {
  id: number;
  originalName?: string | null;
  storedName?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  url?: string;
};

export type NoticeImageLink = {
  id: number;
  fileId: number;
  targetTable: string;
  targetId: number;
  fileRole: string;
  sortOrder?: number | null;
  file: NoticeFile;
};

export type Notice = {
  id: number;
  title: string;
  content?: string | null;
  authorId?: number | null;
  authorName?: string | null;
  viewCount?: number | null;
  isVisible?: boolean | null;
  isPinned?: boolean | null;
  status?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  images?: NoticeImageLink[];
};

export type NoticePayload = {
  id?: number;
  title: string;
  content: string;
  authorName?: string;
  isVisible: boolean;
  isPinned: boolean;
  status: string;
  publishedAt?: string;
  imageFileIds?: number[];
  images?: File[];
};

export type Inquiry = {
  id: number;
  userId?: number | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  title?: string | null;
  content?: string | null;
  answer?: string | null;
  answeredBy?: number | null;
  answeredAt?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type InquiryAnswerPayload = {
  answer: string;
  status?: string;
};

const DEFAULT_NOTICE_PATH = "/api/notices";
const DEFAULT_INQUIRY_PATH = "/api/inquiries";

function joinUrl(baseUrl: string, path = "") {
  if (!path) {
    return baseUrl;
  }

  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function getApiBase(path: string, envKey: string) {
  const directBase = import.meta.env[envKey];

  if (directBase) {
    return directBase;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (apiBaseUrl) {
    return joinUrl(apiBaseUrl, path);
  }

  const authUrl = import.meta.env.VITE_AUTH_VALIDATE_URL;

  if (authUrl) {
    try {
      return joinUrl(new URL(authUrl).origin, path);
    } catch {
      return joinUrl(authUrl, path);
    }
  }

  return path;
}

const NOTICE_API_BASE = getApiBase(DEFAULT_NOTICE_PATH, "VITE_NOTICE_API_BASE_URL");
const INQUIRY_API_BASE = getApiBase(DEFAULT_INQUIRY_PATH, "VITE_INQUIRY_API_BASE_URL");

function getMessage(result: ApiResult<unknown>, fallback: string) {
  return result.message || result.msg || fallback;
}

function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeAssetUrl(url?: string | null) {
  if (!url || /^https?:\/\//i.test(url)) {
    return url || "";
  }

  try {
    return joinUrl(new URL(NOTICE_API_BASE).origin, url);
  } catch {
    return url;
  }
}

function normalizeNotice(notice: Notice): Notice {
  return {
    ...notice,
    images: (notice.images || []).map((image) => ({
      ...image,
      file: {
        ...image.file,
        url: normalizeAssetUrl(image.file?.url),
      },
    })),
  };
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const contentType = response.headers.get("content-type") ?? "";
  const result = contentType.includes("application/json")
    ? ((await response.json()) as ApiResult<T>)
    : ({
        success: response.ok,
        data: null as T,
        msg: response.ok ? "" : `HTTP ${response.status}`,
      } satisfies ApiResult<T>);

  if (!response.ok || !result.success) {
    throw new Error(getMessage(result, `요청에 실패했습니다. HTTP ${response.status}`));
  }

  return result.data;
}

export function formatAdminContentApiError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export async function getNotices(token: string | null, q = "", includeHidden = true) {
  const params = new URLSearchParams();
  if (q.trim()) {
    params.set("q", q.trim());
  }
  if (includeHidden) {
    params.set("includeHidden", "true");
  }

  const query = params.toString();
  const data = await requestJson<Notice[]>(
    query ? `${NOTICE_API_BASE}?${query}` : NOTICE_API_BASE,
    { headers: authHeaders(token) }
  );

  return data.map(normalizeNotice);
}

export async function getNotice(token: string | null, id: number) {
  const data = await requestJson<Notice>(
    `${joinUrl(NOTICE_API_BASE, String(id))}?incrementView=false`,
    { headers: authHeaders(token) }
  );

  return normalizeNotice(data);
}

export async function saveNotice(token: string | null, payload: NoticePayload) {
  const formData = new FormData();
  formData.set("id", String(payload.id || 0));
  formData.set("title", payload.title);
  formData.set("content", payload.content);
  formData.set("authorName", payload.authorName || "");
  formData.set("isVisible", String(payload.isVisible));
  formData.set("isPinned", String(payload.isPinned));
  formData.set("status", payload.status);

  if (payload.publishedAt) {
    formData.set("publishedAt", payload.publishedAt);
  }

  for (const fileId of payload.imageFileIds || []) {
    formData.append("imageFileIds", String(fileId));
  }

  for (const file of payload.images || []) {
    formData.append("images", file);
  }

  const data = await requestJson<Notice>(NOTICE_API_BASE, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });

  return normalizeNotice(data);
}

export async function deleteNotice(token: string | null, id: number) {
  return requestJson<Notice>(joinUrl(NOTICE_API_BASE, String(id)), {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function getInquiries(token: string | null, q = "", status = "") {
  const params = new URLSearchParams();
  if (q.trim()) {
    params.set("q", q.trim());
  }
  if (status) {
    params.set("status", status);
  }

  const query = params.toString();
  return requestJson<Inquiry[]>(
    query ? `${INQUIRY_API_BASE}?${query}` : INQUIRY_API_BASE,
    { headers: authHeaders(token) }
  );
}

export async function getInquiry(token: string | null, id: number) {
  return requestJson<Inquiry>(joinUrl(INQUIRY_API_BASE, String(id)), {
    headers: authHeaders(token),
  });
}

export async function answerInquiry(
  token: string | null,
  id: number,
  payload: InquiryAnswerPayload
) {
  return requestJson<Inquiry>(joinUrl(INQUIRY_API_BASE, String(id)), {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateInquiryStatus(token: string | null, id: number, status: string) {
  return requestJson<Inquiry>(joinUrl(INQUIRY_API_BASE, String(id)), {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
}

export async function deleteInquiry(token: string | null, id: number) {
  return requestJson<Inquiry>(joinUrl(INQUIRY_API_BASE, String(id)), {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
