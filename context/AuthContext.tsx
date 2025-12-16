import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = async () => {
    try {
        // 1. Tenta recuperar a sessão local
        const sessionUser = await api.getSession();
        
        if (sessionUser) {
          // 2. VERIFICAÇÃO DE INTEGRIDADE (CRÍTICO)
          // Verifica se esse usuário da sessão realmente existe no "Banco de Dados" atual.
          // Isso previne o problema da "Sessão Zumbi" onde o navegador tem um user ID
          // que não existe mais no array de users do localStorage/API.
          const dbUser = await api.getDriverData(sessionUser.id);
          
          if (!dbUser) {
              console.warn("Sessão inválida detectada (Usuário não encontrado no DB). Realizando logout forçado.");
              api.logout();
              setUser(null);
          } else {
              // Se existe, atualiza com os dados frescos do DB
              setUser(dbUser);
          }
        }
    } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        setUser(null);
    } finally {
        setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (user) {
        // Busca sempre a versão mais atual do banco de dados
        const freshData = await api.getDriverData(user.id);
        if (freshData) {
            setUser(freshData);
        } else {
            // Se tentar atualizar e o usuário sumiu do banco, desloga
            logout();
        }
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const logout = () => {
    api.logout();
    setUser(null);
    // Opcional: Redirecionar ou limpar estados globais se necessário
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};