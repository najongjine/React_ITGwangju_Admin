import React from "react";
import { useAuth } from "../contexts/AuthContext";

const ContextAPI_Test: React.FC = () => {
  const { token, isAuthenticated, setToken, clearToken, checkToken, authMessage } = useAuth();

  const handleLoginTest = () => {
    const serverToken = "server-token-example";
    setToken(serverToken);
  };

  const handleCheckToken = async () => {
    const result = await checkToken();

    alert(result.success ? "token ok" : `token invalid: ${result.msg}`);
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Context API Test</h1>

      <p>isAuthenticated: {String(isAuthenticated)}</p>
      <p>token: {token ?? "none"}</p>
      <p>authMessage: {authMessage || "none"}</p>

      <button type="button" onClick={handleLoginTest}>
        test login
      </button>

      <button type="button" onClick={handleCheckToken} style={{ marginLeft: 8 }}>
        check token
      </button>

      <button type="button" onClick={clearToken} style={{ marginLeft: 8 }}>
        logout
      </button>
    </main>
  );
};

export default ContextAPI_Test;
