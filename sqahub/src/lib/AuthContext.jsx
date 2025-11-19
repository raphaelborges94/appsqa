import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiClient } from '@/api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);

      // Verificar se tem token salvo
      const token = apiClient.getToken();
      if (!token) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        return;
      }

      // Verificar se o token é válido buscando o usuário atual
      const currentUser = await apiClient.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      // Se o token for inválido, remover do localStorage
      if (error.status === 401 || error.status === 403) {
        apiClient.auth.logout();
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    const data = await apiClient.auth.login(email, password);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  };

  const register = async (email, password, name) => {
    const data = await apiClient.auth.register(email, password, name);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  };

  const logout = () => {
    apiClient.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      login,
      register,
      logout,
      checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
