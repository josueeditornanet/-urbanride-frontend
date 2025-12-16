import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/Auth';
import { PassengerDashboard } from './pages/PassengerDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { DriverOnboarding } from './pages/DriverOnboarding';
import { UserRole, VerificationStatus } from './types';

// Simple Layout
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  
  // Helper to display detailed status for drivers
  const getRoleBadge = () => {
      if (user?.role === UserRole.PASSENGER) return 'Passageiro';
      
      // Driver Logic
      switch(user?.verificationStatus) {
          case VerificationStatus.VERIFIED: return 'Motorista (Verificado)';
          case VerificationStatus.PENDING: return 'Motorista (Em Análise)';
          case VerificationStatus.REJECTED: return 'Motorista (Atenção)';
          default: return 'Motorista (Não Verificado)';
      }
  };

  const getRoleColor = () => {
     if (user?.role === UserRole.PASSENGER) return 'bg-neon-green text-[#282a36]';
     if (user?.verificationStatus === VerificationStatus.VERIFIED) return 'bg-neon-green text-[#282a36]';
     if (user?.verificationStatus === VerificationStatus.PENDING) return 'bg-dracula-yellow text-[#282a36]';
     if (user?.verificationStatus === VerificationStatus.REJECTED) return 'bg-dracula-red text-white';
     return 'bg-[#44475a] text-white';
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-text-primary bg-dracula-bg">
      <header className="bg-dracula-elevated border-b border-[#44475a] sticky top-0 z-50 shadow-lg backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-green to-dracula-cyan flex items-center justify-center shadow-neon-sm p-2">
               {/* Ícone Universal de Carro (Frente) - Legível e Claro */}
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-[#282a36]">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
               </svg>
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-dracula-cyan">UrbanRide</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              {/* Show Name only on Desktop */}
              <p className="text-sm font-medium hidden sm:block text-text-primary">{user?.name}</p>
              {/* Always show role with enhanced status */}
              <p className={`text-xs font-bold uppercase px-2 py-0.5 rounded-sm inline-block shadow-sm ${getRoleColor()}`}>
                {getRoleBadge()}
              </p>
            </div>
            <button 
              onClick={logout}
              className="text-sm text-dracula-red hover:text-white hover:bg-dracula-red/20 font-medium border border-dracula-red/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="flex-grow p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-dracula-bg to-[#1e1f29]">
        {children}
      </main>
    </div>
  );
};

// Router Component
const AppRouter: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dracula-bg">
        <div className="relative">
           <div className="w-16 h-16 border-4 border-[#44475a] border-t-neon-green rounded-full animate-spin"></div>
           <div className="absolute inset-0 flex items-center justify-center">
             <span className="text-xs text-neon-green font-mono">...</span>
           </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // PASSENGER ROUTE
  if (user.role === UserRole.PASSENGER) {
    return (
      <Layout>
        <PassengerDashboard />
      </Layout>
    );
  }

  // DRIVER ROUTES (CHECK VERIFICATION STATUS)
  if (user.role === UserRole.DRIVER) {
    // If anything other than VERIFIED, show Onboarding Flow
    if (user.verificationStatus !== VerificationStatus.VERIFIED) {
       return (
         <Layout>
            <DriverOnboarding />
         </Layout>
       );
    }
    
    // If VERIFIED, show Dashboard
    return (
      <Layout>
        <DriverDashboard />
      </Layout>
    );
  }

  return null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
};

export default App;