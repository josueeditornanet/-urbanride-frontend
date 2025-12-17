
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Ride, RideStatus, Transaction, ChatMessage } from '../types';
import { Button, StatusBadge, Modal, StarRating, ChatButton, ChatSheet } from '../components/UI';
import { useSoundSystem } from '../hooks/useSoundSystem';

// --- CONSTANTS ---
const DRIVER_CANCEL_REASONS = [
    "Passageiro não apareceu",
    "Endereço incorreto / Não encontrado",
    "Área de risco / Segurança",
    "Problema mecânico com o veículo",
    "Passageiro solicitou cancelamento",
    "Comportamento inadequado do passageiro",
    "Acidente de trânsito",
    "Outro motivo"
];

// --- COMPONENT: DAILY STATS (MOTIVACIONAL) ---
const DailyStatsCard: React.FC<{ 
    todayEarnings: number; 
    completedRides: number;
    onOpenWallet: () => void;
}> = ({ todayEarnings, completedRides, onOpenWallet }) => {
    return (
        <div className="bg-gradient-to-r from-[#282a36] to-[#2d2f3d] border border-[#44475a] rounded-2xl p-5 shadow-lg mb-6 relative overflow-hidden group">
            {/* Background Decor */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-neon-green/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-neon-green/10"></div>

            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></span>
                        <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Faturamento Hoje</p>
                    </div>
                    <p className="text-4xl font-display font-bold text-white tracking-tight">
                        R$ {todayEarnings.toFixed(2)}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                        {completedRides} {completedRides === 1 ? 'corrida finalizada' : 'corridas finalizadas'}
                    </p>
                </div>

                <button 
                    onClick={onOpenWallet}
                    className="flex flex-col items-center justify-center bg-[#1e1f29] hover:bg-[#44475a] border border-[#44475a] hover:border-text-secondary rounded-xl p-3 transition-all active:scale-95 shadow-lg group/btn"
                >
                    <svg className="w-6 h-6 text-text-secondary group-hover/btn:text-white mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="text-[10px] font-bold text-text-secondary group-hover/btn:text-white uppercase">Carteira</span>
                </button>
            </div>
        </div>
    );
};

export const DriverDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { initAudio, playNewRideSound, playMessageSound } = useSoundSystem(); // AUDIO HOOK
  
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [lastScan, setLastScan] = useState<string>("--:--");

  // SECURITY STATE (TRAVA DE INICIALIZAÇÃO)
  // Começa como TRUE para bloquear tudo até sabermos o estado real
  const [isCheckingState, setIsCheckingState] = useState(true);

  // FINANCIAL STATE
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletStep, setWalletStep] = useState<'DETAILS' | 'RECHARGE_AMOUNT' | 'QR'>('DETAILS');
  const [walletTab, setWalletTab] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY'); 
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [pixData, setPixData] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // NEW: STATS STATE
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayRidesCount, setTodayRidesCount] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // RATING STATE
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [shouldBlock, setShouldBlock] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // CHAT STATE
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // CANCELLATION STATE (NEW)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // UI STATE SAFEGUARDS
  const [isAccepting, setIsAccepting] = useState<string | null>(null); 

  // --- AUDIO MEMORY STATE (MITIGAÇÃO DE REPETIÇÃO) ---
  const seenRidesRef = useRef<Set<string>>(new Set());
  const lastMessageCountRef = useRef<number>(0);

  // --- CALCULADORA DE GANHOS DO DIA ---
  const fetchFinancials = async () => {
      if(!user) return;
      
      const history = await api.getWalletHistory(user.id);
      setTransactions(history.reverse()); 

      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);

      const earnings = history
        .filter(t => t.type === 'EARNING' && t.date >= startOfDay.getTime())
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      const ridesCount = history.filter(t => t.type === 'EARNING' && t.date >= startOfDay.getTime()).length;

      setTodayEarnings(earnings);
      setTodayRidesCount(ridesCount);
  };

  // --- HELPERS PARA O MODAL DE CARTEIRA ---
  const getFilteredTransactions = () => {
      const now = new Date();
      let startTime = 0;

      if (walletTab === 'DAY') {
          startTime = new Date(now.setHours(0,0,0,0)).getTime();
      } else if (walletTab === 'WEEK') {
          const day = now.getDay();
          const diff = now.getDate() - day;
          startTime = new Date(now.setDate(diff)).setHours(0,0,0,0);
      } else if (walletTab === 'MONTH') {
          startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      }

      return transactions.filter(t => t.date >= startTime);
  };

  const getFinancialSummary = () => {
      const filtered = getFilteredTransactions();
      const gross = filtered
        .filter(t => t.type === 'EARNING')
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      return { gross };
  };

  useEffect(() => {
      if(user) fetchFinancials();
  }, [user, isRatingOpen]);

  // --- MAIN POLLING LOOP (COM LOGICA DE ÁUDIO E TRAVA) ---
  useEffect(() => {
      if (!user) return;

      const runLoop = async () => {
          const now = new Date().toLocaleTimeString();
          setLastScan(now);

          if (isRatingOpen) {
              setIsCheckingState(false);
              return;
          }

          // 1. Verificar corrida ativa
          const activeRes = await api.getDriverActiveRide(user.id);
          
          if (activeRes.success && activeRes.data) {
              const freshRide = activeRes.data;
              setActiveRide(freshRide);
              setIsOnline(true);
              
              // Se achamos uma corrida, liberamos a trava, mas o UI já vai renderizar a corrida
              setIsCheckingState(false);
              
              // CHAT AUDIO LOGIC
              if (freshRide.messages) {
                  const currentCount = freshRide.messages.length;
                  const lastMsg = freshRide.messages[currentCount - 1];
                  
                  // Se a quantidade de mensagens aumentou E a última não fui eu que mandei
                  if (currentCount > lastMessageCountRef.current && lastMsg && lastMsg.senderId !== user.id) {
                      playMessageSound();
                  }
                  
                  // Atualiza a memória
                  lastMessageCountRef.current = currentCount;

                  const unread = freshRide.messages.some((m: ChatMessage) => !m.isRead && m.senderId !== user.id);
                  setHasUnreadMessages(unread);
              }

          } else {
              setActiveRide(null);
              // Reset chat memory when no active ride
              lastMessageCountRef.current = 0;
              
              // Se não tem corrida, liberamos a trava para mostrar o dashboard normal
              setIsCheckingState(false);

              // 2. Buscar novas corridas se online
              if (isOnline) {
                  const availRes = await api.getAvailableRides(user.id);
                  if (availRes.success && availRes.rides) {
                      const rides = availRes.rides;
                      
                      // AUDIO ALERT LOGIC
                      let hasNewRide = false;
                      rides.forEach(r => {
                          if (!seenRidesRef.current.has(r.id)) {
                              hasNewRide = true;
                              seenRidesRef.current.add(r.id);
                          }
                      });

                      if (hasNewRide) {
                          playNewRideSound();
                      }
                      
                      setAvailableRides(rides);
                  } else {
                      setAvailableRides([]);
                  }
              }
          }
      };

      // Executa imediatamente na montagem
      runLoop();
      
      const timer = setInterval(runLoop, 3000);
      return () => clearInterval(timer);
  }, [user, isOnline, isRatingOpen, playNewRideSound, playMessageSound]); 

  // --- ACTIONS ---

  const handleGoOnline = () => {
      initAudio(); // DESTROVA O AUDIO DO NAVEGADOR (CRÍTICO)
      setIsOnline(true);
  };

  const handleAccept = async (id: string) => {
      if (!user || isAccepting) return; 
      setIsAccepting(id); 
      try {
          const res = await api.acceptRide(user.id, id);
          if (res.success && res.data) {
              setActiveRide(res.data);
              setAvailableRides([]);
              await refreshUser(); 
          } else {
              if (res.message === "SALDO_INSUFICIENTE") {
                  setWalletStep('RECHARGE_AMOUNT');
                  setShowWalletModal(true);
              } else {
                  alert("Erro: " + res.message);
              }
          }
      } catch (e) {
          console.error("Accept error", e);
      } finally {
          setIsAccepting(null); 
      }
  };

  const updateStatus = async (status: RideStatus) => {
      if (!activeRide) return;
      const res = await api.updateRideStatus(activeRide.id, status);
      if (res.success && res.data) {
          setActiveRide(res.data);
          if (status === RideStatus.COMPLETED) {
              setIsRatingOpen(true);
              // Como a cobrança agora é no final, atualizamos o usuário imediatamente
              await refreshUser();
              fetchFinancials();
          }
      }
  };

  // DRIVER CANCEL LOGIC
  const handleDriverCancel = async () => {
      if (!activeRide || !cancelReason) return;
      setIsCancelling(true);
      try {
          // Atualiza status para CANCELLED.
          // NÃO COBRA NADA. NÃO PRECISA ESTORNAR.
          await api.updateRideStatus(activeRide.id, RideStatus.CANCELLED, cancelReason);
          setActiveRide(null);
          setIsCancelModalOpen(false);
          setCancelReason(null);
      } catch (e) {
          alert("Erro ao cancelar corrida");
      } finally {
          setIsCancelling(false);
      }
  };

  const handleSubmitRating = async () => {
      if (!user || !activeRide) return;
      setIsSubmittingRating(true);
      try {
          await api.rateRide(activeRide.id, activeRide.passengerId, ratingValue, shouldBlock, user.id);
          setIsRatingOpen(false);
          setActiveRide(null); 
          setRatingValue(0);
          setShouldBlock(false);
          fetchFinancials(); 
      } catch (e) {
          alert("Erro ao enviar avaliação");
      } finally {
          setIsSubmittingRating(false);
      }
  };

  const handleGeneratePix = async () => {
      setIsProcessingPayment(true);
      try {
          const res = await api.generatePixCharge(selectedAmount);
          if (res.success) {
              setPixData(res.data);
              setWalletStep('QR');
          }
      } catch (e) {
          alert("Erro ao gerar PIX");
      } finally {
          setIsProcessingPayment(false);
      }
  };

  const handleSimulatePayment = async () => {
      if(!user) return;
      setIsProcessingPayment(true);
      try {
          const res = await api.confirmPixPayment(user.id, selectedAmount);
          if(res.success) {
              await refreshUser();
              setPixData(null);
              setWalletStep('DETAILS'); 
              alert("Pagamento confirmado! Saldo adicionado.");
          }
      } catch (e) {
          alert("Erro no pagamento");
      } finally {
          setIsProcessingPayment(false);
      }
  };

  const handleOpenChat = async () => {
      if (!activeRide || !user) return;
      setIsChatOpen(true);
      setHasUnreadMessages(false); 
      await api.markMessagesAsRead(activeRide.id, user.id);
  };

  const handleSendMessage = async (msg: string) => {
      if (!activeRide || !user) return;
      await api.sendMessage(activeRide.id, user.id, msg);
      const res = await api.getRideStatus(activeRide.id);
      if(res.data) setActiveRide(res.data);
  };


  if (!user) return null;

  // --- TRAVA DE SEGURANÇA VISUAL ---
  // Se estamos checando o estado, mostramos um loader de tela cheia.
  // Isso impede que o motorista veja ou clique em qualquer coisa antes de sabermos se ele está em corrida.
  if (isCheckingState) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-dracula-bg">
              <div className="flex flex-col items-center animate-pulse">
                  <div className="w-16 h-16 border-4 border-[#44475a] border-t-neon-green rounded-full animate-spin mb-4"></div>
                  <h2 className="text-xl font-bold text-white tracking-wide">Sincronizando...</h2>
                  <p className="text-sm text-text-secondary">Verificando viagens ativas</p>
              </div>
          </div>
      );
  }

  return (
      <div className="min-h-screen relative pb-40"> 
          
          <div className="p-4 space-y-4">
              
              {!activeRide && !isRatingOpen && (
                  <DailyStatsCard 
                    todayEarnings={todayEarnings} 
                    completedRides={todayRidesCount}
                    onOpenWallet={() => {
                        setWalletStep('DETAILS');
                        setShowWalletModal(true);
                    }}
                  />
              )}

              {isOnline && !activeRide && (
                <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#6272a4] animate-pulse">
                        Buscando passageiros...
                    </span>
                    <span className="text-[10px] font-mono text-[#44475a]">
                        Check: {lastScan}
                    </span>
                </div>
              )}

              {!isOnline && (
                  <div className="flex flex-col items-center justify-center h-[30vh] opacity-40 animate-fade-in">
                      <div className="w-32 h-32 rounded-full border-4 border-[#44475a] flex items-center justify-center mb-4">
                          <svg className="w-16 h-16 text-[#44475a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                      </div>
                      <h2 className="text-xl font-bold text-white mb-1">Você está Offline</h2>
                      <p className="text-sm text-text-secondary">Fique online para começar a faturar.</p>
                  </div>
              )}

              {isOnline && !activeRide && !isRatingOpen && (
                  <div className="space-y-4">
                      {availableRides.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 opacity-70">
                              <div className="relative w-16 h-16 mb-4">
                                  <div className="absolute inset-0 border-4 border-[#44475a] rounded-full"></div>
                                  <div className="absolute inset-0 border-4 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                              </div>
                              <p className="text-white font-medium">Radar ligado</p>
                              <p className="text-sm text-text-secondary">Procurando corridas na região...</p>
                          </div>
                      ) : (
                          availableRides.map(ride => {
                              const estimatedFee = Number((ride.price * 0.10).toFixed(2));
                              const netEarnings = ride.price - estimatedFee;
                              const isThisRideAccepting = isAccepting === ride.id;

                              return (
                                <div key={ride.id} className="bg-[#282a36] border border-[#44475a] p-5 rounded-2xl shadow-xl hover:border-neon-green hover:shadow-[0_0_15px_rgba(80,250,123,0.2)] transition-all animate-slide-up transform active:scale-[0.98]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold bg-neon-green/10 text-neon-green px-2 py-0.5 rounded border border-neon-green/20">
                                                    NOVA CHAMADA
                                                </span>
                                            </div>
                                            <h3 className="font-display font-bold text-3xl text-white">R$ {ride.price.toFixed(2)}</h3>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-xl font-bold text-white mb-1">{ride.distanceKm} km</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3 mb-5 pl-4 border-l-2 border-[#44475a]">
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 bg-neon-green rounded-full shadow-[0_0_5px_#50fa7b]"></div>
                                            <p className="text-sm text-white font-medium truncate">{ride.origin}</p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 bg-dracula-pink rounded-full"></div>
                                            <p className="text-sm text-white font-medium truncate">{ride.destination}</p>
                                        </div>
                                    </div>

                                    <div className="bg-[#1e1f29] rounded-lg p-3 mb-4 flex justify-between items-center text-xs">
                                        <div>
                                            <span className="block text-text-secondary">Taxa (10%)</span>
                                            <span className="font-mono text-dracula-red">- R$ {estimatedFee.toFixed(2)}</span>
                                        </div>
                                        <div className="h-6 w-px bg-[#44475a]"></div>
                                        <div>
                                            <span className="block text-text-secondary">Seu Lucro</span>
                                            <span className="font-mono font-bold text-neon-green">+ R$ {netEarnings.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <Button 
                                        size="lg" 
                                        className="w-full font-bold text-lg shadow-neon-md" 
                                        onClick={() => handleAccept(ride.id)}
                                        isLoading={isThisRideAccepting}
                                        disabled={isAccepting !== null}
                                    >
                                        ACEITAR CORRIDA
                                    </Button>
                                </div>
                              );
                          })
                      )}
                  </div>
              )}

              {activeRide && !isRatingOpen && (
                  <div className="bg-[#282a36] border border-neon-green rounded-3xl p-6 shadow-[0_0_30px_rgba(80,250,123,0.15)] animate-slide-up relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/5 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10 animate-pulse"></div>
                      <div className="text-center mb-8 relative z-10">
                          <StatusBadge status={activeRide.status} />
                          <h2 className="text-4xl font-display font-bold text-white mt-4 mb-2">R$ {activeRide.price.toFixed(2)}</h2>
                          <div className="inline-flex items-center gap-2 bg-[#1e1f29] border border-[#44475a] px-3 py-1.5 rounded-lg">
                              <span className="w-2 h-2 rounded-full bg-neon-green"></span>
                              <span className="text-sm text-text-secondary font-mono uppercase">{activeRide.paymentMethod}</span>
                          </div>
                      </div>
                      
                      <div className="space-y-6 mb-8 relative z-10">
                          <div className="flex gap-4 items-start">
                              <div className="flex flex-col items-center mt-1">
                                  <div className="w-4 h-4 rounded-full bg-neon-green shadow-[0_0_10px_#50fa7b]"></div>
                                  <div className="w-0.5 h-full min-h-[40px] bg-gradient-to-b from-neon-green to-dracula-pink opacity-50 my-1"></div>
                                  <div className="w-4 h-4 rounded-full bg-dracula-pink"></div>
                              </div>
                              <div className="flex-1 space-y-8">
                                  <div>
                                      <p className="text-xs text-text-secondary uppercase font-bold mb-1">Coletar em</p>
                                      <p className="text-lg text-white font-medium leading-tight">{activeRide.origin}</p>
                                  </div>
                                  <div>
                                      <p className="text-xs text-text-secondary uppercase font-bold mb-1">Levar para</p>
                                      <p className="text-lg text-white font-medium leading-tight">{activeRide.destination}</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="grid gap-3 relative z-10">
                          {activeRide.status === 'ACCEPTED' && (
                              <Button size="lg" onClick={() => updateStatus(RideStatus.DRIVER_ARRIVED)} className="w-full">CHEGUEI AO LOCAL</Button>
                          )}
                          {activeRide.status === 'DRIVER_ARRIVED' && (
                              <Button size="lg" variant="success" onClick={() => updateStatus(RideStatus.RUNNING)} className="w-full">INICIAR CORRIDA</Button>
                          )}
                          {activeRide.status === 'RUNNING' && (
                              <Button size="lg" variant="warning" onClick={() => updateStatus(RideStatus.COMPLETED)} className="w-full">FINALIZAR E COBRAR</Button>
                          )}
                          
                          {/* BOTÃO DE CANCELAMENTO DISCRETO (GHOST VARIANT) */}
                          <div className="pt-2 flex justify-center">
                             <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                    setCancelReason(null);
                                    setIsCancelModalOpen(true);
                                }} 
                                className="text-xs text-text-secondary hover:text-dracula-red hover:bg-dracula-red/10 border border-transparent hover:border-dracula-red/30 transition-all"
                             >
                                 Problemas com a corrida? Cancelar
                             </Button>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          {activeRide && !isRatingOpen && (
              <>
                <ChatButton hasUnread={hasUnreadMessages} onClick={handleOpenChat} />
                <ChatSheet 
                    isOpen={isChatOpen} 
                    onClose={() => setIsChatOpen(false)}
                    messages={activeRide.messages || []}
                    currentUserId={user.id}
                    onSendMessage={handleSendMessage}
                    role="DRIVER"
                />
              </>
          )}

          {!activeRide && !isRatingOpen && (
              <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#282a36]/95 backdrop-blur-xl border-t border-[#44475a] shadow-[0_-5px_30px_rgba(0,0,0,0.5)] transition-all duration-300 pb-safe">
                  <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
                      {!isOnline ? (
                          <div className="w-full">
                              <button 
                                onClick={handleGoOnline}
                                className="w-full group relative bg-neon-green hover:bg-neon-green-hover active:scale-[0.98] transition-all duration-200 rounded-full h-16 md:h-20 flex items-center justify-center shadow-[0_0_20px_rgba(80,250,123,0.4)]"
                              >
                                  <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-30"></div>
                                  <span className="text-[#282a36] font-display font-black text-xl md:text-2xl tracking-wide uppercase flex items-center gap-2">
                                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                      Iniciar Jornada
                                  </span>
                              </button>
                              <p className="text-center text-xs text-text-secondary mt-3">Toque para ficar disponível</p>
                          </div>
                      ) : (
                          <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                      <div className="w-3 h-3 bg-neon-green rounded-full animate-pulse shadow-[0_0_10px_#50fa7b]"></div>
                                      <span className="text-white font-bold tracking-wide">ONLINE</span>
                                  </div>
                                  <p className="text-xs text-text-secondary truncate">Recebendo chamados em sua área...</p>
                              </div>
                              <button onClick={() => setIsOnline(false)} className="bg-[#44475a] hover:bg-dracula-red hover:text-white text-text-primary px-6 py-3 rounded-full font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 border border-white/5">
                                  <span className="w-2 h-2 rounded-full bg-current"></span>
                                  FICAR OFFLINE
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          )}

          <Modal
            isOpen={showWalletModal}
            onClose={() => {
                setShowWalletModal(false);
                setWalletStep('DETAILS');
            }}
            title={walletStep === 'DETAILS' ? "Gestão Financeira" : "Recarregar Saldo"}
          >
              {walletStep === 'DETAILS' && (
                  <div className="space-y-6">
                      
                      <div className="flex justify-between items-center bg-[#1e1f29] p-4 rounded-xl border border-[#44475a]">
                          <div>
                              <p className="text-[10px] uppercase text-text-secondary font-bold tracking-wider mb-1">Crédito p/ Taxas</p>
                              <p className={`text-2xl font-mono font-bold ${(user.prepaidCredits || 0) < 10 ? 'text-dracula-red' : 'text-neon-green'}`}>
                                  R$ {(user.prepaidCredits || 0).toFixed(2)}
                              </p>
                          </div>
                          <Button size="sm" onClick={() => setWalletStep('RECHARGE_AMOUNT')} className="shadow-none">
                              Recarregar
                          </Button>
                      </div>

                      <div className="flex p-1 bg-[#1e1f29] rounded-lg border border-[#44475a]">
                          {(['DAY', 'WEEK', 'MONTH'] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={() => setWalletTab(tab)}
                                className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${
                                    walletTab === tab 
                                    ? 'bg-[#44475a] text-white shadow-sm' 
                                    : 'text-text-secondary hover:text-white'
                                }`}
                              >
                                  {tab === 'DAY' ? 'Hoje' : tab === 'WEEK' ? 'Semana' : 'Mês'}
                              </button>
                          ))}
                      </div>

                      {(() => {
                          const summary = getFinancialSummary();
                          return (
                              <div className="bg-[#282a36] border border-[#44475a] p-5 rounded-xl flex items-center justify-between shadow-lg">
                                  <div>
                                      <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1">
                                          Faturamento Bruto
                                      </p>
                                      <p className="text-xs text-[#6272a4]">
                                          Total ganho em corridas
                                      </p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-3xl font-display font-bold text-white">
                                          R$ {summary.gross.toFixed(2)}
                                      </p>
                                  </div>
                              </div>
                          );
                      })()}

                      <div>
                          <h4 className="text-xs font-bold text-text-secondary mb-3 border-b border-[#44475a] pb-2 uppercase tracking-wider">
                              Extrato ({walletTab === 'DAY' ? 'Hoje' : walletTab === 'WEEK' ? 'Esta Semana' : 'Este Mês'})
                          </h4>
                          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                              {getFilteredTransactions().length === 0 ? (
                                  <div className="text-center py-6 opacity-50">
                                      <p className="text-sm text-text-secondary">Sem movimentações no período.</p>
                                  </div>
                              ) : (
                                  getFilteredTransactions().map(t => (
                                      <div key={t.id} className="flex flex-col group hover:bg-[#44475a]/20 p-2 rounded-lg transition-colors border-b border-[#44475a]/30 last:border-0">
                                          <div className="flex justify-between items-center mb-1">
                                            <div>
                                              <p className="text-white font-bold text-sm group-hover:text-neon-green transition-colors">{t.description}</p>
                                              <p className="text-[10px] text-text-secondary">{new Date(t.date).toLocaleDateString()} • {new Date(t.date).toLocaleTimeString()}</p>
                                            </div>
                                            <span className={`font-mono font-bold text-sm ${t.type === 'CREDIT' || t.type === 'EARNING' ? 'text-neon-green' : 'text-dracula-red'}`}>
                                              {t.type === 'CREDIT' || t.type === 'EARNING' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                                            </span>
                                          </div>
                                          
                                          {t.metadata && (
                                              <div className="mt-1 pl-2 border-l-2 border-[#6272a4]/50 ml-1 space-y-1">
                                                  {t.metadata.passengerName && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-[#bd93f9]">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                        <span>{t.metadata.passengerName}</span>
                                                    </div>
                                                  )}
                                                  <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-neon-green shrink-0"></span>
                                                        <span className="truncate max-w-[150px]">{t.metadata.origin}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-dracula-pink shrink-0"></span>
                                                        <span className="truncate max-w-[150px]">{t.metadata.destination}</span>
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>
              )}

              {walletStep === 'RECHARGE_AMOUNT' && (
                  <div className="space-y-4">
                      <p className="text-sm text-text-secondary text-center mb-4">
                          Selecione o valor para recarregar via PIX.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                          {[20, 50, 100, 200].map(val => (
                              <button
                                key={val}
                                onClick={() => setSelectedAmount(val)}
                                className={`p-4 rounded-xl border-2 font-bold text-lg transition-all ${selectedAmount === val ? 'border-neon-green bg-neon-green/10 text-white' : 'border-[#44475a] text-text-secondary hover:border-[#6272a4]'}`}
                              >
                                  R$ {val}
                              </button>
                          ))}
                      </div>
                      <div className="flex gap-2 mt-4">
                          <Button variant="secondary" onClick={() => setWalletStep('DETAILS')} className="flex-1">
                              Voltar
                          </Button>
                          <Button onClick={handleGeneratePix} isLoading={isProcessingPayment} className="flex-[2]">
                              Gerar PIX
                          </Button>
                      </div>
                  </div>
              )}

              {walletStep === 'QR' && (
                  <div className="text-center space-y-4">
                      <div className="bg-white p-4 rounded-xl inline-block">
                          <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                             <p className="text-black font-mono text-xs break-all p-2">
                                 {pixData?.qr_code.substring(0, 50)}...
                             </p>
                          </div>
                      </div>
                      <p className="text-sm text-white font-bold">R$ {selectedAmount.toFixed(2)}</p>
                      <div className="bg-[#1e1f29] p-3 rounded-lg border border-[#44475a]">
                           <p className="text-xs text-text-secondary font-mono break-all mb-2">
                               {pixData?.qr_code}
                           </p>
                           <button className="text-neon-green text-xs font-bold hover:underline">Copiar Código</button>
                      </div>
                      
                      <Button onClick={handleSimulatePayment} isLoading={isProcessingPayment} variant="success" className="w-full">
                          [DEV] Simular Pagamento Confirmado
                      </Button>
                      <button onClick={() => setWalletStep('RECHARGE_AMOUNT')} className="text-sm text-text-secondary hover:text-white underline">
                          Voltar
                      </button>
                  </div>
              )}
          </Modal>

          <Modal
            isOpen={isRatingOpen}
            onClose={() => {}}
            title="Corrida Finalizada"
          >
             <div className="flex flex-col items-center gap-6 py-4">
                  <div className="w-16 h-16 bg-neon-green rounded-full flex items-center justify-center text-3xl mb-2 shadow-neon-lg">
                      💰
                  </div>
                  
                  <div className="text-center">
                      <h2 className="text-2xl font-bold text-white mb-1">Receba R$ {activeRide?.price.toFixed(2)}</h2>
                      <p className="text-text-secondary">Pagamento via {activeRide?.paymentMethod}</p>
                  </div>

                  <div className="w-full h-px bg-[#44475a]"></div>

                  <div className="text-center">
                      <p className="text-sm text-text-secondary mb-2">Como foi o passageiro</p>
                      <h3 className="text-xl font-bold text-white mb-4">{activeRide?.passengerName}?</h3>
                      <StarRating rating={ratingValue} onChange={setRatingValue} size="lg" />
                  </div>

                  <Button 
                      onClick={handleSubmitRating} 
                      className="w-full mt-2" 
                      disabled={ratingValue === 0 || isSubmittingRating}
                      isLoading={isSubmittingRating}
                  >
                      Confirmar e Receber
                  </Button>
             </div>
          </Modal>

          {/* NEW: DRIVER CANCELLATION MODAL */}
          <Modal
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            title="Cancelar Corrida"
          >
             <div className="space-y-4">
                <div className="bg-dracula-red/10 border border-dracula-red/30 p-3 rounded-lg flex items-center gap-3">
                     <div className="bg-dracula-red/20 p-2 rounded-full text-dracula-red">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                     </div>
                     <p className="text-xs text-text-secondary">
                         Cancelamentos frequentes podem afetar sua reputação na plataforma.
                     </p>
                </div>

                <p className="text-sm text-text-secondary mb-2">Selecione o motivo:</p>
                <div className="grid gap-2 max-h-[40vh] overflow-y-auto pr-1">
                    {DRIVER_CANCEL_REASONS.map((reason) => (
                        <button
                            key={reason}
                            onClick={() => setCancelReason(reason)}
                            className={`p-3 rounded-lg text-sm text-left transition-all border ${
                                cancelReason === reason 
                                ? 'bg-dracula-red/20 border-dracula-red text-white' 
                                : 'bg-[#1e1f29] border-[#44475a] text-text-secondary hover:border-[#6272a4] hover:text-white'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    cancelReason === reason ? 'border-dracula-red' : 'border-[#6272a4]'
                                }`}>
                                    {cancelReason === reason && <div className="w-2 h-2 rounded-full bg-dracula-red"></div>}
                                </div>
                                {reason}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="pt-2 flex gap-3">
                    <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)} className="flex-1">
                        Voltar
                    </Button>
                    <Button 
                        variant="danger" 
                        onClick={handleDriverCancel} 
                        className="flex-[2] font-bold"
                        disabled={!cancelReason || isCancelling}
                        isLoading={isCancelling}
                    >
                        Confirmar Cancelamento
                    </Button>
                </div>
             </div>
          </Modal>
      </div>
  );
};
