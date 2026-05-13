export type ApiResult<T> = {
  success: boolean;
  data: T;
  code?: string;
  message?: string;
  msg?: string;
};

export type CourseFile = {
  id: number;
  originalName?: string | null;
  storedName?: string | null;
  storageType?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  url?: string;
};

export type CourseImageLink = {
  link: {
    id: number;
    sortOrder?: number | null;
  };
  file: CourseFile | null;
};

export type CourseSession = {
  id: number;
  courseId: number;
  sessionName: string;
  sessionNo?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  classStartTime?: string | null;
  classEndTime?: string | null;
  capacity?: number | null;
  status?: string | null;
};

export type Course = {
  id: number;
  courseName: string;
  summary?: string | null;
  description?: string | null;
  isVisible?: boolean | null;
  status?: string | null;
  sortOrder?: number | null;
  thumbnailFileId?: number | null;
  thumbnail?: CourseFile | null;
  descriptionImages?: CourseImageLink[];
  sessions?: CourseSession[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CoursePayload = {
  id: number;
  courseName: string;
  summary: string;
  description: string;
  isVisible: boolean;
  status: string;
  sortOrder: number;
  mainImage?: File | null;
  descriptionImages: File[];
  descriptionImageOrders?: number[];
};

function getCourseApiBaseUrl() {
  const courseApiBaseUrl = import.meta.env.VITE_COURSE_API_BASE_URL;

  if (courseApiBaseUrl) {
    return courseApiBaseUrl;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (apiBaseUrl) {
    return joinUrl(apiBaseUrl, "/api/courses");
  }

  const authValidateUrl = import.meta.env.VITE_AUTH_VALIDATE_URL;

  if (authValidateUrl) {
    try {
      return joinUrl(new URL(authValidateUrl).origin, "/api/courses");
    } catch {
      return joinUrl(authValidateUrl, "/api/courses");
    }
  }

  return "/api/courses";
}

const COURSE_API_BASE = getCourseApiBaseUrl();

export class CourseApiError extends Error {
  status: number;
  statusText: string;
  url: string;
  method: string;
  code: string;
  responseBody: string;

  constructor(params: {
    message: string;
    status: number;
    statusText: string;
    url: string;
    method: string;
    code?: string;
    responseBody?: string;
  }) {
    super(params.message);
    this.name = "CourseApiError";
    this.status = params.status;
    this.statusText = params.statusText;
    this.url = params.url;
    this.method = params.method;
    this.code = params.code ?? "";
    this.responseBody = params.responseBody ?? "";
  }
}

function joinUrl(baseUrl: string, path = "") {
  if (!path) {
    return baseUrl;
  }

  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function getMessage(result: ApiResult<unknown>, fallback: string) {
  return result.message || result.msg || fallback;
}

function toSingleLine(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function trimBody(text: string) {
  const normalized = toSingleLine(text);
  return normalized.length > 500 ? `${normalized.slice(0, 500)}...` : normalized;
}

export function formatCourseApiError(error: unknown, fallback: string) {
  if (error instanceof CourseApiError) {
    const details = [
      `요청: ${error.method} ${error.url}`,
      error.status > 0 ? `상태: HTTP ${error.status} ${error.statusText}` : "",
      error.code ? `코드: ${error.code}` : "",
      error.responseBody ? `응답: ${error.responseBody}` : "",
    ].filter(Boolean);

    return [error.message || fallback, ...details].join("\n");
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const method = init?.method ?? "GET";
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new CourseApiError({
      message: error instanceof Error ? error.message : "네트워크 요청에 실패했습니다.",
      status: 0,
      statusText: "NETWORK_ERROR",
      url,
      method,
    });
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new CourseApiError({
      message: response.ok
        ? "서버가 JSON이 아닌 응답을 보냈습니다."
        : `서버 요청이 실패했습니다. HTTP ${response.status}`,
      status: response.status,
      statusText: response.statusText,
      url,
      method,
      responseBody: trimBody(text),
    });
  }

  const result = (await response.json()) as ApiResult<T>;

  if (!response.ok || !result.success) {
    throw new CourseApiError({
      message: getMessage(result, `서버 요청이 실패했습니다. HTTP ${response.status}`),
      status: response.status,
      statusText: response.statusText,
      url,
      method,
      code: result.code,
      responseBody: trimBody(JSON.stringify(result)),
    });
  }

  return result.data;
}

export async function getCourses(q = "") {
  const params = new URLSearchParams();
  if (q.trim()) {
    params.set("q", q.trim());
  }

  const query = params.toString();
  return requestJson<Course[]>(query ? `${COURSE_API_BASE}?${query}` : COURSE_API_BASE);
}

export async function getCourse(id: number) {
  return requestJson<Course>(joinUrl(COURSE_API_BASE, String(id)));
}

export async function deleteCourse(id: number) {
  return requestJson<Course>(joinUrl(COURSE_API_BASE, String(id)), {
    method: "DELETE",
  });
}

export async function saveCourse(payload: CoursePayload) {
  const formData = new FormData();
  formData.set("id", String(payload.id));
  formData.set("courseName", payload.courseName);
  formData.set("summary", payload.summary);
  formData.set("description", payload.description);
  formData.set("isVisible", String(payload.isVisible));
  formData.set("status", payload.status);
  formData.set("sortOrder", String(payload.sortOrder));

  if (payload.mainImage) {
    formData.set("mainImage", payload.mainImage);
  }

  for (const [index, file] of payload.descriptionImages.entries()) {
    formData.append("descriptionImages", file);
    formData.append("descriptionImageOrders", String(payload.descriptionImageOrders?.[index] ?? index));
  }

  return requestJson<Course>(COURSE_API_BASE, {
    method: "POST",
    body: formData,
  });
}

export async function getCourseSessions(courseId: number) {
  return requestJson<CourseSession[]>(joinUrl(COURSE_API_BASE, `${courseId}/sessions`));
}

export async function saveCourseSession(
  courseId: number,
  payload: Partial<CourseSession> & { id: number; sessionName: string }
) {
  return requestJson<CourseSession>(joinUrl(COURSE_API_BASE, `${courseId}/sessions`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteCourseSession(courseId: number, sessionId: number) {
  return requestJson<CourseSession>(
    joinUrl(COURSE_API_BASE, `${courseId}/sessions/${sessionId}`),
    {
      method: "DELETE",
    }
  );
}
