import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { validateAuthToken, type ApiResponse, type AuthUser } from "../services/authApi";
import {
  getStoredAuthToken,
  removeStoredAuthToken,
  saveStoredAuthToken,
} from "../services/authTokenStorage";

type AuthStatus = "idle" | "checking" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  authMessage: string;
  isAuthenticated: boolean;
  setToken: (token: string, user?: AuthUser | null) => void;
  setSession: (token: string, user: AuthUser) => void;
  getToken: () => string | null;
  loadToken: () => string | null;
  clearToken: () => void;
  checkToken: () => Promise<ApiResponse<AuthUser | null>>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setTokenState] = useState<string | null>(() => getStoredAuthToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    getStoredAuthToken() ? "authenticated" : "unauthenticated"
  );
  const [authMessage, setAuthMessage] = useState("");

  const setToken = useCallback((nextToken: string, nextUser: AuthUser | null = null) => {
    saveStoredAuthToken(nextToken);
    setTokenState(nextToken);
    setUser(nextUser);
    setStatus("authenticated");
    setAuthMessage("");
  }, []);

  const setSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken, nextUser);
  }, [setToken]);

  const getToken = useCallback(() => {
    return token;
  }, [token]);

  const loadToken = useCallback(() => {
    const storedToken = getStoredAuthToken();

    setTokenState(storedToken);
    setUser(null);
    setStatus(storedToken ? "authenticated" : "unauthenticated");

    return storedToken;
  }, []);

  const clearToken = useCallback(() => {
    removeStoredAuthToken();
    setTokenState(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const checkToken = useCallback(async () => {
    const currentToken = getStoredAuthToken();

    setStatus("checking");
    const result = await validateAuthToken(currentToken);

    if (result.success) {
      setTokenState(currentToken);
      setUser(result.data);
      setStatus("authenticated");
      setAuthMessage("");
      return result;
    }

    removeStoredAuthToken();
    setTokenState(null);
    setUser(null);
    setStatus("unauthenticated");
    setAuthMessage(result.msg ?? "");

    return result;
  }, []);

  useEffect(() => {
    const storedToken = getStoredAuthToken();

    if (storedToken) {
      void checkToken();
    }
  }, [checkToken]);

  const value = useMemo(
    () => ({
      token,
      user,
      status,
      authMessage,
      isAuthenticated: status === "authenticated" && Boolean(token),
      setToken,
      setSession,
      getToken,
      loadToken,
      clearToken,
      checkToken,
    }),
    [authMessage, checkToken, clearToken, getToken, loadToken, setSession, setToken, status, token, user]
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
