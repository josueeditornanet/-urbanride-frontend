import { createContext, useContext, useState, useEffect } from 'react';
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
    setIsLoading(true);
    try {
        const sessionUser = await api.getSession();

        if (sessionUser) {
          // Busca dados frescos do servidor
          const dbUser = await api.getDriverData(String(sessionUser.id));

          if (!dbUser) {
              console.warn("Usuário não encontrado ou erro de conexão. Mantendo sessão offline ou limpando.");
              // Se não encontrar o usuário, remove a sessão local
              api.logout();
              setUser(null);
          } else {
              setUser(dbUser);
          }
        }
    } catch (error) {
        console.error("Erro fatal ao verificar sessão:", error);
        setUser(null);
    } finally {
        setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (user) {
        const freshData = await api.getDriverData(String(user.id));
        if (freshData) {
            setUser(freshData);
        } else {
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