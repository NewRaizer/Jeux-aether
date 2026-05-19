import { createContext, useContext, useEffect, useState } from "react";
import { api, setTokens } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      const me = await api.get("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
      setTokens(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem("immersyte_tokens");
    if (stored) loadMe();
    else setLoading(false);
  }, []);

  async function login(email, password) {
    const tokens = await api.post("/auth/login", { email, password }, false);
    setTokens(tokens);
    const me = await api.get("/auth/me");
    setUser(me);
    return me;
  }

  function logout() {
    setTokens(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
