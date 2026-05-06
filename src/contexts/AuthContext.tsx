import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { validateAuthToken, type ApiResponse } from "../services/authApi";
import {
  getStoredAuthToken,
  removeStoredAuthToken,
  saveStoredAuthToken,
} from "../services/authTokenStorage";

type AuthStatus = "idle" | "checking" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  token: string | null;
  status: AuthStatus;
  authMessage: string;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  getToken: () => string | null;
  loadToken: () => string | null;
  clearToken: () => void;
  checkToken: () => Promise<ApiResponse>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setTokenState] = useState<string | null>(() => getStoredAuthToken());
  const [status, setStatus] = useState<AuthStatus>(() =>
    getStoredAuthToken() ? "authenticated" : "unauthenticated"
  );
  const [authMessage, setAuthMessage] = useState("");

  const setToken = useCallback((nextToken: string) => {
    saveStoredAuthToken(nextToken);
    setTokenState(nextToken);
    setStatus("authenticated");
    setAuthMessage("");
  }, []);

  const getToken = useCallback(() => {
    return token;
  }, [token]);

  const loadToken = useCallback(() => {
    const storedToken = getStoredAuthToken();

    setTokenState(storedToken);
    setStatus(storedToken ? "authenticated" : "unauthenticated");

    return storedToken;
  }, []);

  const clearToken = useCallback(() => {
    removeStoredAuthToken();
    setTokenState(null);
    setStatus("unauthenticated");
  }, []);

  const checkToken = useCallback(async () => {
    const currentToken = getStoredAuthToken();

    setStatus("checking");
    const result = await validateAuthToken(currentToken);

    if (result.success) {
      setTokenState(currentToken);
      setStatus("authenticated");
      setAuthMessage("");
      return result;
    }

    removeStoredAuthToken();
    setTokenState(null);
    setStatus("unauthenticated");
    setAuthMessage(result.msg);

    return result;
  }, []);

  const value = useMemo(
    () => ({
      token,
      status,
      authMessage,
      isAuthenticated: status === "authenticated" && Boolean(token),
      setToken,
      getToken,
      loadToken,
      clearToken,
      checkToken,
    }),
    [authMessage, checkToken, clearToken, getToken, loadToken, setToken, status, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
