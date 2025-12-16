import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button, Card, Input } from '../components/UI';
import { VerificationStatus, User } from '../types';

// Components for different document types
const UploadCard: React.FC<{
  title: string;
  description: string;
  isUploaded: boolean;
  fileId?: string;
  onUpload: (file: File) => Promise<void>;
  isLoading: boolean;
}> = ({ title, description, isUploaded, fileId, onUpload, isLoading }) => {
  const [preview, setPreview] = useState<string | null>(null);
  // REF to access the input element directly
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fileId && isUploaded) {
      api.getDocumentUrl(fileId).then(setPreview);
    }
  }, [fileId, isUploaded]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Local preview immediately
      setPreview(URL.createObjectURL(file));
      await onUpload(file);

      // CRITICAL UX FIX: Reset input value so user can re-upload the same file if needed (e.g. after error)
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`border-2 border-dashed rounded-xl p-6 transition-all relative overflow-hidden group/card ${isUploaded ? 'border-neon-green bg-neon-green/5' : 'border-[#44475a] hover:border-[#6272a4]'}`}>
      
      {/* Visual Checkmark for Saved State */}
      {isUploaded && (
          <div className="absolute top-0 right-0 bg-neon-green text-[#282a36] px-3 py-1 rounded-bl-xl text-xs font-bold uppercase shadow-sm z-10">
              Salvo
          </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-text-primary">{title}</h3>
      </div>
      <p className="text-sm text-text-secondary mb-4">{description}</p>
      
      {preview ? (
        <div className="relative w-full h-32 mb-4 bg-black/20 rounded-lg overflow-hidden group">
          <img src={preview} alt="Documento" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <label className="cursor-pointer text-white text-sm font-bold underline">
              Alterar Foto
              <input 
                ref={inputRef}
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleChange} 
                disabled={isLoading} 
              />
            </label>
          </div>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center w-full h-32 border border-[#44475a] bg-[#282a36] rounded-lg cursor-pointer hover:bg-[#44475a]/30 transition-colors ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isLoading ? (
               <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin"></div>
            ) : (
               <>
                <svg className="w-8 h-8 mb-2 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <p className="text-xs text-text-secondary">Clique para enviar</p>
               </>
            )}
          </div>
          <input 
            ref={inputRef}
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleChange} 
            disabled={isLoading} 
          />
        </label>
      )}
    </div>
  );
};

export const DriverOnboarding: React.FC = () => {
  const { user, refreshUser, setUser } = useAuth();
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDevConfirm, setShowDevConfirm] = useState(false); // NEW: Local confirm state
  
  // FORM STATE FOR PERSONAL DATA
  const [cpf, setCpf] = useState(user?.cpf || '');
  const [phone, setPhone] = useState(user?.phone || '');
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Auto-redirect checks
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    // Simplificado: Apenas verifica se o status mudou no banco (por um admin externo)
    if (user?.verificationStatus === VerificationStatus.PENDING) {
       interval = setInterval(async () => {
           await refreshUser();
       }, 3000); 
    }
    return () => clearInterval(interval);
  }, [user?.verificationStatus, refreshUser]);

  const handleUpload = async (file: File, type: 'cnh' | 'crlv' | 'profile') => {
    if (!user) return;
    setLoadingDoc(type);
    try {
      const res = await api.uploadDriverDocument(user.id, file, type);
      if (res.success && res.data) setUser({ ...res.data });
    } catch (e) {
      alert('Erro ao enviar documento');
    } finally {
      setLoadingDoc(null);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) return;
    if (!agreedToTerms) {
        alert("Você deve concordar com os termos para continuar.");
        return;
    }
    if (!cpf || !phone) {
        alert("Por favor, preencha seu CPF e Celular.");
        return;
    }

    setIsSubmitting(true);
    try {
      // 1. UPDATE PROFILE DATA FIRST
      await api.updateUserProfile(user.id, { cpf, phone });

      // 2. SUBMIT FOR REVIEW
      const res = await api.submitForReview(user.id);
      if (res.success && res.data) setUser({ ...res.data });
    } catch (e) {
      alert('Erro ao submeter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForceApprove = async () => {
      if(!user) return;
      
      // FIX: Use local state instead of window.confirm to avoid sandbox restrictions
      if (!showDevConfirm) {
          setShowDevConfirm(true);
          // Auto reset after 3s
          setTimeout(() => setShowDevConfirm(false), 3000);
          return;
      }

      await api.adminForceApprove(user.id);
      await refreshUser();
      setShowDevConfirm(false);
  };

  const handleResetVerification = async () => {
      if (!user) return;
      setIsSubmitting(true);
      try {
          const res = await api.resetDriverVerification(user.id);
          if (res.success && res.data) setUser({ ...res.data });
      } catch (e) {
          alert("Erro ao tentar novamente");
      } finally {
          setIsSubmitting(false);
      }
  };

  // 1. PENDING STATE (Wait Screen)
  if (user?.verificationStatus === VerificationStatus.PENDING) {
      return (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in relative">
              <div className="w-24 h-24 bg-[#282a36] rounded-full border-4 border-[#44475a] border-t-neon-green animate-spin mb-8 shadow-2xl"></div>
              <h1 className="text-3xl font-display font-bold text-white mb-2">Analisando Documentos</h1>
              <p className="text-text-secondary max-w-md mx-auto mb-8">
                  Nossa equipe está verificando sua habilitação e os dados do veículo. Isso geralmente leva alguns minutos.
              </p>
              
              <div className="bg-[#282a36] p-4 rounded-xl border border-neon-green/20 max-w-sm w-full mb-12">
                  <p className="text-sm text-neon-green mb-2 font-bold uppercase tracking-wider">Status: Em Análise</p>
                  <div className="h-1 bg-[#44475a] rounded-full overflow-hidden">
                      <div className="h-full bg-neon-green w-2/3 animate-pulse"></div>
                  </div>
              </div>

              {/* TEST BUTTON - ONLY FOR DEV/DEMO */}
              <div className="absolute bottom-10">
                  <button 
                    onClick={handleForceApprove}
                    className={`text-xs font-mono px-4 py-2 rounded transition-all ${
                        showDevConfirm 
                        ? "text-white bg-dracula-red border border-dracula-red animate-pulse" 
                        : "text-dracula-purple border border-dracula-purple/30 bg-[#282a36]/80 hover:bg-dracula-purple hover:text-white"
                    }`}
                  >
                    {showDevConfirm ? "TEM CERTEZA? (CLIQUE P/ CONFIRMAR)" : "[DEV] Simular Aprovação Admin"}
                  </button>
              </div>
          </div>
      );
  }

  // 2. REJECTED STATE (With Reason)
  if (user?.verificationStatus === VerificationStatus.REJECTED) {
      return (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
              <Card className="border-dracula-red bg-dracula-red/5 text-center max-w-md w-full animate-slide-up">
                  <div className="w-16 h-16 bg-dracula-red/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-dracula-red/30">
                      <svg className="w-8 h-8 text-dracula-red" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-dracula-red mb-2">Atenção Necessária</h2>
                  <p className="text-text-primary mb-2">Não foi possível aprovar seu cadastro.</p>
                  
                  {user.rejectionReason && (
                    <div className="bg-[#282a36] border border-dracula-red/30 p-3 rounded-lg mb-6 text-sm">
                        <span className="block text-dracula-red text-xs uppercase font-bold mb-1">Motivo:</span>
                        <span className="text-white">{user.rejectionReason}</span>
                    </div>
                  )}

                  <p className="text-text-secondary text-sm mb-6">Por favor, corrija as pendências apontadas e envie novamente.</p>
                  
                  <Button onClick={handleResetVerification} isLoading={isSubmitting} variant="secondary" className="w-full">
                      Corrigir Documentos
                  </Button>
              </Card>
          </div>
      );
  }

  // 3. UNVERIFIED STATE (Upload Form)
  return (
    <div className="max-w-3xl mx-auto pb-10">
        <div className="mb-8 text-center sm:text-left">
            <h1 className="text-3xl font-display font-bold text-white mb-2">Ativar Conta de Motorista</h1>
            <p className="text-text-secondary">Preencha seus dados e envie os documentos para começar.</p>
        </div>

        {/* SECTION 1: PERSONAL DATA (NEW) */}
        <div className="bg-[#282a36] border border-[#44475a] rounded-xl p-6 mb-8 shadow-lg">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-neon-green text-[#282a36] rounded-full flex items-center justify-center text-xs">1</span>
                Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                    label="CPF" 
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                />
                <Input 
                    label="Celular (WhatsApp)" 
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>
        </div>

        {/* SECTION 2: DOCUMENTS */}
        <h3 className="text-white font-bold mb-4 flex items-center gap-2 px-1">
            <span className="w-6 h-6 bg-neon-green text-[#282a36] rounded-full flex items-center justify-center text-xs">2</span>
            Documentação
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <UploadCard 
                title="Foto de Perfil"
                description="Uma foto clara do seu rosto."
                isUploaded={!!user?.documents?.profile}
                fileId={user?.documents?.profile}
                onUpload={(f) => handleUpload(f, 'profile')}
                isLoading={loadingDoc === 'profile'}
            />
             <UploadCard 
                title="CNH Digital"
                description="Foto da Carteira Nacional de Habilitação."
                isUploaded={!!user?.documents?.cnh}
                fileId={user?.documents?.cnh}
                onUpload={(f) => handleUpload(f, 'cnh')}
                isLoading={loadingDoc === 'cnh'}
            />
             <UploadCard 
                title="CRLV (Veículo)"
                description="Documento do veículo que você utilizará."
                isUploaded={!!user?.documents?.crlv}
                fileId={user?.documents?.crlv}
                onUpload={(f) => handleUpload(f, 'crlv')}
                isLoading={loadingDoc === 'crlv'}
            />
             
             {/* SUBMIT CARD WITH TERMS */}
             <div className="bg-[#282a36] border border-[#44475a] rounded-xl p-6 flex flex-col justify-center">
                 <h3 className="text-white font-bold mb-4 text-center">Finalizar Cadastro</h3>
                 
                 <label className="flex items-start gap-3 p-3 bg-[#21222c] rounded-lg border border-[#44475a] cursor-pointer hover:border-[#6272a4] transition-colors mb-4">
                     <input 
                        type="checkbox" 
                        className="mt-1 w-4 h-4 rounded border-gray-500 text-neon-green focus:ring-neon-green bg-[#282a36]"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                     />
                     <span className="text-xs text-text-secondary">
                        Declaro que as informações são verdadeiras e autorizo a UrbanRide a realizar a verificação de antecedentes criminais.
                     </span>
                 </label>

                 <Button 
                    onClick={handleSubmitReview}
                    isLoading={isSubmitting}
                    disabled={!user?.documents?.cnh || !user?.documents?.crlv || !user?.documents?.profile || !agreedToTerms || !cpf || !phone}
                    className="w-full"
                 >
                     Enviar para Análise
                 </Button>
             </div>
        </div>
    </div>
  );
};