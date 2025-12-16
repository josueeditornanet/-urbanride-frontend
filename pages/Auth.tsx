import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserRole } from '../types';
import { Button, Input, Card } from '../components/UI';

export const AuthPage: React.FC = () => {
  const { setUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PASSENGER);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const res = await api.login(email);
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          setError(res.message || 'Falha no login');
        }
      } else {
        const res = await api.register(name, email, password, role);
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          setError(res.message || 'Falha no registro');
        }
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      setError('');
      setIsGoogleLoading(true);
      try {
          const res = await api.loginWithGoogle(role);
          if (res.success && res.data) {
              setUser(res.data);
          } else {
              setError("Erro ao conectar com Google");
          }
      } catch (err) {
          setError("Erro na conexão");
      } finally {
          setIsGoogleLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dracula-bg relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-dracula-purple/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[100px] pointer-events-none"></div>

      <Card className="w-full max-w-md relative z-10 border-[#bd93f9]/20 shadow-neon-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-dracula-cyan mb-2">UrbanRide</h1>
          <p className="text-text-secondary mt-2 font-light">
            {isLogin ? 'O futuro da mobilidade urbana' : 'Junte-se à revolução hoje'}
          </p>
        </div>

        {error && (
          <div className="bg-dracula-red/10 text-dracula-red p-3 rounded-xl text-sm mb-6 border border-dracula-red/20 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* SOCIAL LOGIN */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
            className="w-full bg-white text-gray-800 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
            )}
            {isLogin ? 'Entrar com Google' : 'Cadastrar com Google'}
          </button>

          <div className="flex items-center gap-3 my-4">
              <div className="h-px bg-[#44475a] flex-1"></div>
              <span className="text-text-secondary text-xs uppercase font-bold">Ou continue com e-mail</span>
              <div className="h-px bg-[#44475a] flex-1"></div>
          </div>

          {!isLogin && (
            <Input 
              label="Nome Completo" 
              placeholder="Ex: Maria Silva" 
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="font-mono text-sm"
            />
          )}
          
          <Input 
            label="E-mail" 
            type="email" 
            placeholder="nome@exemplo.com" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="font-mono text-sm"
          />
          
          <Input 
            label="Senha" 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="font-mono text-sm"
          />

          {/* Type Selector (Visible on Register OR when Login for Google Context) */}
          <div className="mb-6 pt-2">
            <label className="block text-sm font-medium text-text-secondary mb-3">Eu sou:</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole(UserRole.PASSENGER)}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-300 ${
                  role === UserRole.PASSENGER 
                    ? 'bg-neon-green text-[#282a36] border-neon-green shadow-neon-md' 
                    : 'bg-[#282a36] text-text-secondary border-[#44475a] hover:border-text-secondary'
                }`}
              >
                Passageiro
              </button>
              <button
                type="button"
                onClick={() => setRole(UserRole.DRIVER)}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-300 ${
                  role === UserRole.DRIVER 
                    ? 'bg-neon-green text-[#282a36] border-neon-green shadow-neon-md' 
                    : 'bg-[#282a36] text-text-secondary border-[#44475a] hover:border-text-secondary'
                }`}
              >
                Motorista
              </button>
            </div>
          </div>

          <Button type="submit" onClick={handleSubmit} isLoading={isLoading} className="w-full mt-4">
            {isLogin ? 'Entrar com E-mail' : 'Criar Conta com E-mail'}
          </Button>
        </form>

        <div className="mt-8 text-center pt-4 border-t border-[#44475a]">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-dracula-purple hover:text-dracula-pink transition-colors font-medium"
          >
            {isLogin ? "Novo aqui? Crie sua conta" : "Já tem conta? Fazer login"}
          </button>
        </div>
      </Card>
    </div>
  );
};