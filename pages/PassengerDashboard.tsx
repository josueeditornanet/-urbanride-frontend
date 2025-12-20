import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Ride, RideStatus, RouteDetails, PaymentMethod } from '../types';
import { Button, Card, Modal, StarRating, ChatButton, ChatSheet, StatusBadge } from '../components/UI';
import { useSoundSystem } from '../hooks/useSoundSystem';

export const PassengerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { initAudio, playMessageSound } = useSoundSystem();
  
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeDetails, setRouteDetails] = useState<RouteDetails | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const lastMessageCountRef = useRef(0);

  // Monitoramento da corrida ativa
  useEffect(() => {
    let interval: any;
    if (activeRide && activeRide.status !== RideStatus.CANCELLED && activeRide.status !== RideStatus.COMPLETED) {
      interval = setInterval(async () => {
        const res = await api.getRideStatus(activeRide.id);
        if (res.success && res.data) {
          setActiveRide(res.data);
          
          // Lógica de Som para novas mensagens
          const currentMsgs = res.data.messages?.length || 0;
          if (currentMsgs > lastMessageCountRef.current) {
            const lastMsg = res.data.messages![currentMsgs - 1];
            if (String(lastMsg.senderId) !== String(user?.id)) {
                playMessageSound();
            }
            lastMessageCountRef.current = currentMsgs;
          }

          if (res.data.status === RideStatus.COMPLETED) {
            setIsRatingOpen(true);
            clearInterval(interval);
          }
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeRide, user?.id]);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;
    setCalculatingRoute(true);
    try {
        const res = await api.calculateRoute({ address: origin }, { address: destination });
        if (res.success && res.data) {
            setRouteDetails(res.data);
        } else {
            alert(res.message || "Erro ao calcular rota");
        }
    } finally {
        setCalculatingRoute(false);
    }
  };

  const handleConfirm = async () => {
    if (!routeDetails) return;
    initAudio();
    setIsRequesting(true);
    try {
        const res = await api.requestRide(
            user!.id, 
            origin, 
            destination, 
            routeDetails.price, 
            routeDetails.distanceValue, 
            paymentMethod
        );
        if (res.success && res.data) {
            setActiveRide(res.data);
            setRouteDetails(null);
        } else {
            alert(res.message || "Erro ao solicitar corrida");
        }
    } finally {
        setIsRequesting(false);
    }
  };

  const handleSendMessage = async (content: string) => {
      if (!activeRide) return;
      const res = await api.sendMessage(activeRide.id, user!.id, content);
      if (res.success) {
          // Atualiza localmente para feedback instantâneo se desejar, 
          // ou espera o polling do setInterval
      }
  };

  const submitRating = async () => {
      if (!activeRide) return;
      await api.rateRide(activeRide.id, activeRide.driverId!, ratingValue, false, user!.id);
      setIsRatingOpen(false);
      setActiveRide(null);
      setOrigin('');
      setDestination('');
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {!activeRide ? (
        <Card title="Para onde vamos?">
          <form onSubmit={handlePreview} className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs text-text-secondary uppercase font-bold ml-1">Partida</label>
                <input 
                    className="w-full p-4 bg-[#1e1f29] rounded-xl text-white border border-[#44475a] focus:border-neon-green outline-none transition-all" 
                    placeholder="Sua localização atual" 
                    value={origin} 
                    onChange={e => setOrigin(e.target.value)} 
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs text-text-secondary uppercase font-bold ml-1">Destino</label>
                <input 
                    className="w-full p-4 bg-[#1e1f29] rounded-xl text-white border border-[#44475a] focus:border-neon-green outline-none transition-all" 
                    placeholder="Para onde você quer ir?" 
                    value={destination} 
                    onChange={e => setDestination(e.target.value)} 
                />
            </div>
            
            <div className="pt-2">
                <Button type="submit" className="w-full" isLoading={calculatingRoute} disabled={!origin || !destination}>
                    Calcular Valor
                </Button>
            </div>
          </form>

          {routeDetails && (
            <div className="mt-6 p-5 bg-[#1e1f29] rounded-2xl border border-neon-green/30 animate-slide-up">
               <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-text-secondary text-xs uppercase font-bold">Valor Estimado</p>
                    <p className="text-neon-green font-display font-bold text-3xl">R$ {routeDetails.price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-medium">{routeDetails.distanceText}</p>
                    <p className="text-text-secondary text-xs">{routeDetails.durationText}</p>
                  </div>
               </div>

               <div className="space-y-3 mb-6">
                  <p className="text-xs text-text-secondary uppercase font-bold">Forma de Pagamento</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[PaymentMethod.CASH, PaymentMethod.PIX].map(method => (
                        <button 
                            key={method}
                            onClick={() => setPaymentMethod(method)}
                            className={`py-2 rounded-lg text-xs font-bold border transition-all ${paymentMethod === method ? 'bg-neon-green text-[#282a36] border-neon-green' : 'bg-[#282a36] text-text-secondary border-[#44475a]'}`}
                        >
                            {method}
                        </button>
                    ))}
                  </div>
               </div>

               <Button onClick={handleConfirm} className="w-full" variant="success" isLoading={isRequesting}>
                   Confirmar Solicitação
               </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-6 animate-fade-in">
            <Card title="Status da Corrida">
                <div className="flex flex-col items-center text-center space-y-4">
                    <StatusBadge status={activeRide.status} />
                    
                    <div className="w-full bg-[#1e1f29] p-4 rounded-xl border border-[#44475a]">
                        <p className="text-xs text-text-secondary uppercase mb-1">Trajeto</p>
                        <p className="text-sm text-white font-medium truncate">{activeRide.origin}</p>
                        <div className="h-4 w-px bg-[#44475a] mx-auto my-1"></div>
                        <p className="text-sm text-white font-medium truncate">{activeRide.destination}</p>
                    </div>

                    {activeRide.driverId ? (
                        <div className="w-full flex items-center gap-4 bg-dracula-bg p-4 rounded-xl border border-neon-green/20">
                            <div className="w-12 h-12 bg-dracula-purple rounded-full flex items-center justify-center text-xl font-bold">
                                {activeRide.driverName?.charAt(0) || 'D'}
                            </div>
                            <div className="text-left flex-1">
                                <p className="text-white font-bold">{activeRide.driverName}</p>
                                <p className="text-xs text-text-secondary">{activeRide.driverCarModel} • {activeRide.driverLicensePlate}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-neon-green font-bold">R$ {activeRide.price.toFixed(2)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-6 flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-[#44475a] border-t-neon-green rounded-full animate-spin mb-3"></div>
                            <p className="text-sm text-text-secondary animate-pulse">Procurando motoristas próximos...</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Chat Float Button */}
            {activeRide.status !== RideStatus.REQUESTED && (
                <ChatButton 
                    hasUnread={activeRide.messages?.some(m => !m.isRead && String(m.senderId) !== String(user?.id)) || false} 
                    onClick={() => {
                        setIsChatOpen(true);
                        api.markMessagesAsRead(activeRide.id, user!.id);
                    }} 
                />
            )}
        </div>
      )}

      {/* Modais */}
      <Modal isOpen={isRatingOpen} onClose={() => {}} title="Avalie seu Motorista">
         <div className="flex flex-col items-center gap-6 py-4">
           <p className="text-text-secondary text-center">Como foi sua experiência com {activeRide?.driverName}?</p>
           <StarRating rating={ratingValue} onChange={setRatingValue} size="lg" />
           <Button onClick={submitRating} className="w-full" variant="success" disabled={ratingValue === 0}>
               Enviar Avaliação
           </Button>
         </div>
      </Modal>

      {activeRide && (
          <ChatSheet 
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            messages={activeRide.messages || []}
            currentUserId={String(user?.id)}
            onSendMessage={handleSendMessage}
            role="PASSENGER"
          />
      )}
    </div>
  );
};