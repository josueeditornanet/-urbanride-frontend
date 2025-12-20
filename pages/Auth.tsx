import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserRole } from '../types';
import { Button, Input, Card } from '../components/UI';

export const AuthPage: React.FC = () => {
  const { setUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PASSENGER);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = isLogin
        ? await api.login(email, password)
        : await api.register(name, email, role, password);

      if (res.success && res.data) {
          setUser(res.data);
      } else {
          setError(res.message || 'Falha na autenticação');
      }
    } catch (err) {
        setError('Erro de conexão com o servidor');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dracula-bg">
      <Card className="w-full max-w-md border-[#bd93f9]/20 shadow-neon-sm">
        <h1 className="text-4xl font-display font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-neon-green to-dracula-cyan mb-8">UrbanRide</h1>

        {error && (
            <div className="bg-dracula-red/10 text-dracula-red p-3 rounded-xl text-sm mb-6 border border-dracula-red/20 animate-pulse text-center">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && <Input label="Nome Completo" value={name} onChange={e => setName(e.target.value)} required />}
          <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input label="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required />

          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole(UserRole.PASSENGER)}
                className={`py-3 rounded-xl border text-sm font-bold transition-all ${role === UserRole.PASSENGER ? 'bg-neon-green text-[#282a36] border-neon-green' : 'bg-[#282a36] text-text-secondary border-[#44475a]'}`}
              >
                Passageiro
              </button>
              <button
                type="button"
                onClick={() => setRole(UserRole.DRIVER)}
                className={`py-3 rounded-xl border text-sm font-bold transition-all ${role === UserRole.DRIVER ? 'bg-neon-green text-[#282a36] border-neon-green' : 'bg-[#282a36] text-text-secondary border-[#44475a]'}`}
              >
                Motorista
              </button>
            </div>
          )}

          <Button type="submit" className="w-full mt-4" isLoading={isLoading}>
              {isLogin ? 'Entrar' : 'Criar Conta'}
          </Button>
        </form>

        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-sm text-dracula-purple hover:underline text-center block">
            {isLogin ? "Ainda não tem conta? Cadastre-se" : "Já tem uma conta? Entre agora"}
        </button>
      </Card>
    </div>
  );
};