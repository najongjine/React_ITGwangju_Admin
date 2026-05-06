const AUTH_TOKEN_STORAGE_KEY = "authToken";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoredAuthToken() {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveStoredAuthToken(token: string) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function removeStoredAuthToken() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

