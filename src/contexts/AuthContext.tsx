import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { login as apiLogin, register as apiRegister, clearTokens, isAuthenticated } from "@/lib/api";

interface AuthContextType {
  isLoggedIn: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));

  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    await apiLogin(user, password);
    setIsLoggedIn(true);
    setUsername(user);
    localStorage.setItem("username", user);
  }, []);

  const register = useCallback(async (user: string, email: string, password: string) => {
    await apiRegister(user, email, password);
    await login(user, password);
  }, [login]);

  const logout = useCallback(() => {
    clearTokens();
    setIsLoggedIn(false);
    setUsername(null);
    localStorage.removeItem("username");
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, username, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
