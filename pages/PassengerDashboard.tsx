
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Ride, RideStatus, GeoLocation, RouteDetails, PaymentMethod, ChatMessage } from '../types';
import { Button, Card, StatusBadge, Modal, Input, StarRating, ChatButton, ChatSheet } from '../components/UI';
import { useSoundSystem } from '../hooks/useSoundSystem'; // IMPORT AUDIO

// --- TYPE DEFINITIONS ---
interface LocationState {
    address: string;
    coords?: GeoLocation;
}

interface CarMarker {
    id: number;
    lat: number; 
    lng: number;
    // For visual simulation only:
    simulatedTop: string;
    simulatedLeft: string;
    simulatedDelay: string;
    simulatedDuration: string;
}

const generateRandomCars = (count: number): CarMarker[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    lat: -23.5 + (Math.random() * 0.01), 
    lng: -46.6 + (Math.random() * 0.01),
    simulatedTop: `${30 + Math.random() * 40}%`,
    simulatedLeft: `${20 + Math.random() * 60}%`,
    simulatedDelay: `${Math.random() * 2}s`,
    simulatedDuration: `${3 + Math.random() * 5}s`
  }));
};

const CANCEL_REASONS = [
    "Motorista não se move no mapa",
    "Tempo de espera muito longo",
    "Motorista solicitou o cancelamento",
    "Mudei meus planos / Desisti",
    "Encontrei outro transporte",
    "Endereço de partida errado",
    "Outro motivo"
];

// --- COMPONENT: AUTOCOMPLETE INPUT ---
const LocationInput: React.FC<{
    placeholder: string;
    value: string;
    onChange: (val: string) => void;
    onSelect: (location: LocationState) => void;
    iconColor?: string;
    rightElement?: React.ReactNode;
    disabled?: boolean;
}> = ({ placeholder, value, onChange, onSelect, iconColor = 'bg-text-secondary', rightElement, disabled }) => {
    const [suggestions, setSuggestions] = useState<{address: string, coords: GeoLocation}[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (value.length > 2 && showSuggestions && !disabled) {
                const res = await api.searchPlaces(value);
                if (res.success && res.data) {
                    setSuggestions(res.data);
                }
            } else {
                setSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [value, showSuggestions, disabled]);

    const handleSelect = (item: {address: string, coords: GeoLocation}) => {
        onChange(item.address);
        onSelect({ address: item.address, coords: item.coords });
        setShowSuggestions(false);
        setSuggestions([]);
    };

    return (
        <div className="relative group z-20">
            <div className={`absolute left-2 top-3.5 w-2 h-2 ${iconColor} rounded-full ring-4 ring-[#282a36]`}></div>
            <div className="relative">
                 <input 
                    className={`w-full pl-8 pr-10 py-3 bg-[#1e1f29] border border-[#44475a] rounded-lg focus:outline-none focus:ring-1 focus:ring-neon-green focus:border-neon-green text-sm text-white placeholder-[#6272a4] transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setShowSuggestions(true);
                    }}
                    disabled={disabled}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                 />
                 {rightElement && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {rightElement}
                    </div>
                 )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#282a36] border border-[#44475a] rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                    {suggestions.map((s, idx) => (
                        <div 
                            key={idx}
                            onClick={() => handleSelect(s)}
                            className="p-3 hover:bg-[#44475a] cursor-pointer border-b border-[#44475a] last:border-0 flex items-center gap-3 transition-colors"
                        >
                            <div className="bg-[#44475a]/50 p-1.5 rounded-full">
                                <svg className="w-4 h-4 text-text-secondary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            </div>
                            <div>
                                <p className="text-sm text-white font-medium">{s.address.split(',')[0]}</p>
                                <p className="text-xs text-text-secondary">{s.address}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: COMPLETE PROFILE FORM ---
const CompleteProfileForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { user, setUser } = useAuth();
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [terms, setTerms] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const res = await api.updateUserProfile(user.id, {
                cpf, phone, birthDate: dob
            });
            if (res.success && res.data) {
                setUser(res.data);
                onSuccess();
            }
        } catch (e) {
            alert("Erro ao salvar perfil");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-neon-green/10 border border-neon-green/30 p-3 rounded-lg flex items-start gap-3 mb-4">
                <svg className="w-5 h-5 text-neon-green shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <p className="text-sm text-text-secondary">Para sua segurança e dos nossos motoristas, precisamos confirmar alguns dados antes da sua primeira viagem.</p>
            </div>

            <Input 
                label="CPF" 
                placeholder="000.000.000-00" 
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                required
            />
            
            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Celular" 
                    placeholder="(11) 99999-9999" 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                />
                <Input 
                    label="Nascimento" 
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    required
                />
            </div>

            <label className="flex items-start gap-3 p-3 bg-[#21222c] rounded-lg border border-[#44475a] cursor-pointer hover:border-[#6272a4] transition-colors mt-2">
                 <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 rounded border-gray-500 text-neon-green focus:ring-neon-green bg-[#282a36]"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                 />
                 <span className="text-xs text-text-secondary">
                    Li e concordo com os <span className="text-neon-green underline">Termos de Uso</span> e <span className="text-neon-green underline">Política de Privacidade</span> da UrbanRide.
                 </span>
            </label>

            <Button 
                onClick={handleSave} 
                isLoading={isSaving} 
                disabled={!cpf || !phone || !dob || !terms}
                className="w-full mt-4"
            >
                Confirmar e Continuar
            </Button>
        </div>
    );
};

// --- SUB-COMPONENT: PAYMENT SELECTOR ---
const PaymentMethodSelector: React.FC<{ 
    selected: PaymentMethod; 
    onChange: (m: PaymentMethod) => void;
}> = ({ selected, onChange }) => {
    
    const methods = [
        { id: PaymentMethod.CASH, label: "Dinheiro", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
        { id: PaymentMethod.PIX, label: "PIX", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
        { id: PaymentMethod.DEBIT_CARD, label: "Débito", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
        { id: PaymentMethod.CREDIT_CARD, label: "Crédito", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
    ];

    return (
        <div className="grid grid-cols-2 gap-2 mt-2">
            {methods.map(m => (
                <button
                    key={m.id}
                    onClick={() => onChange(m.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${selected === m.id ? 'bg-neon-green text-[#282a36] border-neon-green font-bold shadow-neon-sm' : 'bg-[#1e1f29] border-[#44475a] text-text-secondary hover:border-[#6272a4]'}`}
                >
                    {m.icon}
                    <span className="text-sm">{m.label}</span>
                </button>
            ))}
        </div>
    );
};

export const PassengerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { initAudio, playMessageSound } = useSoundSystem(); // AUDIO HOOK
  
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  
  // FORM STATE
  const [origin, setOrigin] = useState<LocationState>({ address: '' });
  const [destination, setDestination] = useState<LocationState>({ address: '' });
  const [isLocating, setIsLocating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  
  // PREVIEW / ROUTE STATE
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeDetails, setRouteDetails] = useState<RouteDetails | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  
  // CANCELLATION INTELLIGENCE STATE (NEW)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // PROGRESSIVE PROFILING STATE
  const [showProfileModal, setShowProfileModal] = useState(false);

  // RATING STATE
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [shouldBlock, setShouldBlock] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // CHAT STATE
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  // AUDIO STATE
  const lastMessageCountRef = useRef<number>(0);

  const [nearbyCars, setNearbyCars] = useState<CarMarker[]>([]);

  useEffect(() => {
    // Check if there is already an active ride in local session to restore state immediately
    const checkActiveRide = async () => {
        if(user) {
            // Restore logic would go here
        }
    };
    checkActiveRide();
    setNearbyCars(generateRandomCars(5)); 
  }, []);

  // Polling for ride updates
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeRide && activeRide.status !== RideStatus.CANCELLED) {
      interval = setInterval(async () => {
        const res = await api.getRideStatus(activeRide.id);
        if (res.success && res.data) {
          const freshRide = res.data;
          setActiveRide(freshRide);

          // AUTO OPEN RATING FOR PASSENGER
          if (freshRide.status === RideStatus.COMPLETED && !isRatingOpen && !isSubmittingRating) {
              setIsRatingOpen(true);
          }

          // CHAT LOGIC
          if (freshRide.messages && user) {
            const currentCount = freshRide.messages.length;
            const lastMsg = freshRide.messages[currentCount - 1];

             // Audio trigger
            if (currentCount > lastMessageCountRef.current && lastMsg && lastMsg.senderId !== user.id) {
                playMessageSound();
            }
            lastMessageCountRef.current = currentCount;

            const unread = freshRide.messages.some((m: ChatMessage) => !m.isRead && m.senderId !== user.id);
            setHasUnreadMessages(unread);
          }
          
          if (isCancelModalOpen && (freshRide.status === RideStatus.DRIVER_ARRIVED || freshRide.status === RideStatus.RUNNING)) {
              setIsCancelModalOpen(false);
          }
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeRide, isRatingOpen, isSubmittingRating, user, isCancelModalOpen, playMessageSound]);

  // STEP 1: CALCULATE ROUTE
  const handlePreviewRoute = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!origin.address || !destination.address) return;

      const start: GeoLocation = origin.coords || { lat: -23.5614, lng: -46.6558, address: origin.address };
      const end: GeoLocation = destination.coords || { lat: -23.6273, lng: -46.6565, address: destination.address };

      setCalculatingRoute(true);
      try {
          const res = await api.calculateRoute(start, end);
          if (res.success && res.data) {
              setRouteDetails(res.data);
              setIsPreviewing(true);
          } else {
              alert("Não foi possível traçar a rota.");
          }
      } catch (err) {
          alert("Erro ao calcular rota.");
      } finally {
          setCalculatingRoute(false);
      }
  };

  // STEP 2: INTERCEPT FOR PROFILE CHECK
  const handleConfirmRideClick = () => {
      initAudio(); // UNLOCK AUDIO ON INTERACTION (CRITICAL)

      if (user && (!user.cpf || !user.phone || !user.birthDate)) {
          setShowProfileModal(true);
          return;
      }
      submitRideRequest();
  };

  // STEP 3: ACTUAL SUBMISSION
  const submitRideRequest = async () => {
    if (!user || !routeDetails) return;
    
    setIsRequesting(true);
    try {
      const res = await api.requestRide(
          user.id, 
          origin.address, 
          destination.address, 
          routeDetails.price,
          routeDetails.distanceValue,
          paymentMethod // PASS PAYMENT METHOD
      );
      
      if (res.success && res.data) {
        setActiveRide(res.data);
        setIsPreviewing(false);
        setRouteDetails(null);
        // Reset chat memory
        lastMessageCountRef.current = 0;
      } else {
        alert(res.message);
      }
    } catch (error) {
      alert('Falha ao solicitar corrida');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelPreview = () => {
      setIsPreviewing(false);
      setRouteDetails(null);
  };

  const handleConfirmCancel = async () => {
      if(!activeRide || !cancelReason) return;
      setIsCancelling(true);
      try {
          await api.updateRideStatus(activeRide.id, RideStatus.CANCELLED, cancelReason);
          setActiveRide(prev => prev ? {...prev, status: RideStatus.CANCELLED} : null);
          setIsCancelModalOpen(false);
          setCancelReason(null);
      } catch(e) {
          alert("Erro ao cancelar");
      } finally {
          setIsCancelling(false);
      }
  };

  const handleReset = () => {
      setActiveRide(null);
      setOrigin({address:''});
      setDestination({address:''});
  };

  const handleSubmitRating = async () => {
      if (!user || !activeRide || !activeRide.driverId) return;
      setIsSubmittingRating(true);
      try {
          await api.rateRide(activeRide.id, activeRide.driverId, ratingValue, shouldBlock, user.id);
          setIsRatingOpen(false);
          handleReset();
          setRatingValue(0);
          setShouldBlock(false);
      } catch (e) {
          alert("Erro ao enviar avaliação");
      } finally {
          setIsSubmittingRating(false);
      }
  };

  // --- CHAT ACTIONS ---
  const handleOpenChat = async () => {
    if (!activeRide || !user) return;
    setIsChatOpen(true);
    setHasUnreadMessages(false);
    await api.markMessagesAsRead(activeRide.id, user.id);
  };

  const handleSendMessage = async (msg: string) => {
    if (!activeRide || !user) return;
    await api.sendMessage(activeRide.id, user.id, msg);
    // Re-fetch to update local state immediately
    const res = await api.getRideStatus(activeRide.id);
    if(res.data) setActiveRide(res.data);
  };

  // --- MAP RENDERER ---
  const ImmersiveMap = () => {
      const getPointsForSvg = () => {
          if (!routeDetails || !routeDetails.polyline) return "";
          
          const points = routeDetails.polyline;
          const lats = points.map(p => p.lat);
          const lngs = points.map(p => p.lng);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          
          const padding = 0.02; 
          
          // FIX: Protected division by zero
          const deltaLat = (maxLat + padding) - (minLat - padding);
          const deltaLng = (maxLng + padding) - (minLng - padding);

          return points.map(p => {
              // Safety check: if delta is 0 (single point), center it (50%)
              const x = deltaLng === 0 ? 50 : ((p.lng - (minLng - padding)) / deltaLng) * 100;
              const y = deltaLat === 0 ? 50 : 100 - ((p.lat - (minLat - padding)) / deltaLat) * 100;
              return `${x},${y}`;
          }).join(" ");
      };

      return (
        <div className="absolute inset-0 bg-[#1e1f29] overflow-hidden z-0 rounded-3xl border border-[#44475a] shadow-inner relative">
            <div className="absolute inset-0 opacity-20" style={{ 
                backgroundImage: 'linear-gradient(#44475a 1px, transparent 1px), linear-gradient(90deg, #44475a 1px, transparent 1px)', 
                backgroundSize: '40px 40px',
                transform: 'perspective(1000px) rotateX(10deg) scale(1.1)'
            }}></div>

            {isPreviewing && routeDetails && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#50fa7b" />
                            <stop offset="100%" stopColor="#8be9fd" />
                        </linearGradient>
                    </defs>
                    <polyline 
                        points={getPointsForSvg()} 
                        fill="none" 
                        stroke="url(#routeGradient)" 
                        strokeWidth="4" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="drop-shadow-[0_0_10px_rgba(80,250,123,0.5)] animate-glow"
                    />
                    {(() => {
                        const pts = getPointsForSvg().split(' ');
                        const start = pts[0].split(',');
                        const end = pts[pts.length-1].split(',');
                        return (
                            <>
                                <circle cx={start[0] + '%'} cy={start[1] + '%'} r="6" fill="#f8f8f2" stroke="#282a36" strokeWidth="2" />
                                <circle cx={end[0] + '%'} cy={end[1] + '%'} r="6" fill="#50fa7b" stroke="#282a36" strokeWidth="2" />
                            </>
                        )
                    })()}
                </svg>
            )}

            {!isPreviewing && nearbyCars.map((car) => (
                <div 
                    key={car.id}
                    className="absolute text-text-primary transition-all duration-[3000ms] ease-in-out z-0"
                    style={{ 
                        top: car.simulatedTop, 
                        left: car.simulatedLeft,
                        animation: `floatCar ${car.simulatedDuration} infinite alternate ease-in-out ${car.simulatedDelay}`
                    }}
                >
                    <svg className="w-8 h-8 transform -rotate-45" viewBox="0 0 24 24" fill="currentColor">
                         <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" fill="#282a36" stroke="#50fa7b" strokeWidth="1.5"/>
                    </svg>
                </div>
            ))}
            
            <style>{`
                @keyframes floatCar {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    100% { transform: translate(20px, -20px) rotate(5deg); }
                }
            `}</style>
        </div>
      );
  };

  return (
    <div className="relative h-[calc(100vh-140px)] w-full"> 
      
      <ImmersiveMap />

      <Modal 
          isOpen={showProfileModal} 
          onClose={() => setShowProfileModal(false)}
          title="Verificação de Identidade"
      >
          <CompleteProfileForm onSuccess={() => {
              setShowProfileModal(false);
              submitRideRequest(); // Auto-continue after save
          }} />
      </Modal>

      {/* RATING MODAL */}
       <Modal
          isOpen={isRatingOpen}
          onClose={() => { /* Prevent Closing */ }}
          title="Pagamento e Avaliação"
       >
           <div className="flex flex-col items-center gap-6 py-4">
                <div className="text-center bg-neon-green/10 border border-neon-green/30 p-4 rounded-xl w-full">
                    <p className="text-xs text-neon-green uppercase font-bold tracking-widest mb-1">Total a Pagar</p>
                    <p className="text-4xl font-bold text-white mb-2">R$ {activeRide?.price.toFixed(2)}</p>
                    <p className="text-xs text-text-secondary">Pague diretamente ao motorista (Dinheiro/PIX)</p>
                </div>

                <div className="w-16 h-16 bg-dracula-purple rounded-full flex items-center justify-center text-2xl font-bold text-white mb-2">
                    {activeRide?.driverName?.charAt(0)}
                </div>
                <div className="text-center">
                    <p className="text-text-secondary text-sm">Como foi o motorista</p>
                    <h3 className="text-xl font-bold text-white">{activeRide?.driverName}?</h3>
                </div>

                <StarRating rating={ratingValue} onChange={setRatingValue} size="lg" />

                {ratingValue === 1 && (
                    <div className="w-full bg-dracula-red/10 border border-dracula-red/30 p-4 rounded-xl animate-fade-in">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={shouldBlock}
                                onChange={e => setShouldBlock(e.target.checked)}
                                className="w-5 h-5 rounded border-dracula-red text-dracula-red bg-[#282a36] focus:ring-dracula-red"
                            />
                            <div className="text-left">
                                <span className="block text-white font-bold text-sm">Bloquear Motorista</span>
                                <span className="block text-dracula-red text-xs">Nunca mais cruzar com este motorista.</span>
                            </div>
                        </label>
                    </div>
                )}

                <Button 
                    onClick={handleSubmitRating} 
                    className="w-full mt-2" 
                    disabled={ratingValue === 0 || isSubmittingRating}
                    isLoading={isSubmittingRating}
                >
                    Confirmar Pagamento e Avaliar
                </Button>
           </div>
       </Modal>
        
        {/* NEW: CANCELLATION INTELLIGENCE MODAL */}
        <Modal
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            title="Deseja mesmo cancelar?"
        >
            <div className="space-y-4">
                {activeRide?.status === RideStatus.ACCEPTED && (
                    <div className="bg-[#282a36] border border-neon-green/30 rounded-lg p-3 flex items-start gap-3">
                         <div className="bg-neon-green/10 p-2 rounded-full">
                            <svg className="w-5 h-5 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         </div>
                         <div>
                             <p className="text-sm text-white font-bold">O motorista já está a caminho!</p>
                             <p className="text-xs text-text-secondary">O cancelamento pode prejudicar o profissional que já se deslocou.</p>
                         </div>
                    </div>
                )}

                <p className="text-sm text-text-secondary mb-2">Por favor, nos informe o motivo:</p>
                <div className="grid gap-2 max-h-[40vh] overflow-y-auto pr-1">
                    {CANCEL_REASONS.map((reason) => (
                        <button
                            key={reason}
                            onClick={() => setCancelReason(reason)}
                            className={`p-3 rounded-lg text-sm text-left transition-all border ${
                                cancelReason === reason 
                                ? 'bg-dracula-purple/20 border-dracula-purple text-white shadow-[0_0_10px_rgba(189,147,249,0.3)]' 
                                : 'bg-[#1e1f29] border-[#44475a] text-text-secondary hover:border-[#6272a4] hover:text-white'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    cancelReason === reason ? 'border-dracula-purple' : 'border-[#6272a4]'
                                }`}>
                                    {cancelReason === reason && <div className="w-2 h-2 rounded-full bg-dracula-purple"></div>}
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
                        onClick={handleConfirmCancel} 
                        className="flex-[2] font-bold"
                        disabled={!cancelReason || isCancelling}
                        isLoading={isCancelling}
                    >
                        Confirmar Cancelamento
                    </Button>
                </div>
            </div>
        </Modal>

        {/* CHAT FLOATING BUTTON */}
        {activeRide && !isRatingOpen && activeRide.driverId && (
            <>
                <ChatButton hasUnread={hasUnreadMessages} onClick={handleOpenChat} />
                <ChatSheet 
                    isOpen={isChatOpen} 
                    onClose={() => setIsChatOpen(false)}
                    messages={activeRide.messages || []}
                    currentUserId={user?.id || ''}
                    onSendMessage={handleSendMessage}
                    role="PASSENGER"
                />
            </>
        )}

      <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-end md:justify-start md:p-8">
        
        {activeRide ? (
            /* --- ACTIVE RIDE STATUS (REDESIGNED) --- */
            <div className="w-full max-w-md mx-auto md:mx-0 pointer-events-auto animate-slide-up">
                 {/* O Card inteiro muda de cor quando o motorista chega para criar urgência */}
                 <div className={`
                    rounded-2xl shadow-2xl border overflow-hidden transition-all duration-500
                    ${activeRide.status === RideStatus.DRIVER_ARRIVED 
                        ? 'bg-neon-green border-neon-green shadow-[0_0_30px_rgba(80,250,123,0.5)]' 
                        : 'bg-[#282a36]/95 border-[#44475a] backdrop-blur-xl'}
                 `}>
                    
                    {/* Header Dinâmico */}
                    <div className={`px-6 py-4 flex items-center justify-between
                        ${activeRide.status === RideStatus.DRIVER_ARRIVED ? 'bg-black/10' : 'bg-[#282a36]/50 border-b border-[#44475a]'}
                    `}>
                        <div className="flex items-center gap-2">
                            {/* --- CORREÇÃO DO STATUS LOGIC --- */}
                            {activeRide.status === RideStatus.REQUESTED ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-dracula-yellow animate-ping"></span>
                                    <h3 className="font-display font-semibold text-text-primary text-lg tracking-wide">
                                        Procurando motorista...
                                    </h3>
                                </>
                            ) : activeRide.status === RideStatus.DRIVER_ARRIVED ? (
                                <>
                                    <span className="w-3 h-3 bg-[#282a36] rounded-full animate-ping"></span>
                                    <h3 className="font-black text-[#282a36] text-lg tracking-wide uppercase">MOTORISTA AQUI</h3>
                                </>
                            ) : (
                                <>
                                    <span className={`w-2 h-2 rounded-full ${activeRide.status === RideStatus.ACCEPTED ? 'bg-dracula-cyan' : 'bg-dracula-purple'} animate-pulse`}></span>
                                    <h3 className="font-display font-semibold text-text-primary text-lg tracking-wide">
                                        {activeRide.status === RideStatus.ACCEPTED ? 'Motorista a caminho' : 'Viagem em curso'}
                                    </h3>
                                </>
                            )}
                        </div>
                        {activeRide.status === RideStatus.ACCEPTED && <span className="text-xs font-mono text-dracula-cyan">~4 min</span>}
                    </div>

                    <div className="p-6">
                        {/* Seção do Motorista (SE EXISTIR) */}
                        {/* REMOVIDA A EXIBIÇÃO DE PLACA E MODELO, MANTENDO APENAS NOME E FOTO */}
                        {activeRide.driverName && activeRide.status !== RideStatus.CANCELLED && activeRide.status !== RideStatus.REQUESTED ? (
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-lg
                                        ${activeRide.status === RideStatus.DRIVER_ARRIVED ? 'bg-[#282a36] text-neon-green' : 'bg-gradient-to-br from-dracula-purple to-dracula-pink text-white'}
                                    `}>
                                        {activeRide.driverName.charAt(0)}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-white text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                                        5.0★
                                    </div>
                                </div>
                                
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${activeRide.status === RideStatus.DRIVER_ARRIVED ? 'text-[#282a36]/70' : 'text-text-secondary'}`}>
                                        Seu Motorista
                                    </p>
                                    <div className="flex justify-between items-center mt-1">
                                        <h4 className={`text-xl font-bold leading-none ${activeRide.status === RideStatus.DRIVER_ARRIVED ? 'text-[#282a36]' : 'text-white'}`}>
                                            {activeRide.driverName}
                                        </h4>
                                    </div>
                                </div>
                            </div>
                        ) : activeRide.status === RideStatus.REQUESTED ? (
                            <div className="flex flex-col items-center justify-center py-4 text-center">
                                <div className="w-12 h-12 border-4 border-[#44475a] border-t-dracula-yellow rounded-full animate-spin mb-3"></div>
                                <p className="text-text-secondary text-sm">Aguarde, estamos contatando os motoristas próximos.</p>
                            </div>
                        ) : null}

                        {/* Ações */}
                        <div className="w-full">
                            {activeRide.status === RideStatus.COMPLETED ? (
                                <Button onClick={() => setIsRatingOpen(true)} className="w-full shadow-neon-sm" variant="primary">
                                    Realizar Pagamento
                                </Button>
                            ) : activeRide.status === RideStatus.CANCELLED ? (
                                <div className="text-center">
                                    <p className="text-dracula-red font-bold mb-3">A corrida foi cancelada.</p>
                                    <Button onClick={handleReset} className="w-full" variant="outline">
                                        Pedir Nova Corrida
                                    </Button>
                                </div>
                            ) : (
                                activeRide.status !== RideStatus.RUNNING && (
                                    <div className="flex flex-col gap-2">
                                        {/* NEW: GHOST BUTTON INSTEAD OF BIG RED BUTTON */}
                                        <Button 
                                            onClick={() => {
                                                setCancelReason(null);
                                                setIsCancelModalOpen(true);
                                            }}
                                            className="w-full text-xs"
                                            variant="ghost"
                                        >
                                            Problemas com a viagem?
                                        </Button>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                 </div>
            </div>
        ) : isPreviewing && routeDetails ? (
            <div className="w-full max-w-md mx-auto md:mx-0 pointer-events-auto animate-slide-up">
                <Card className="bg-[#282a36]/95 backdrop-blur-xl border border-[#44475a] shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                    <div className="mb-4 flex items-center justify-between">
                         <h2 className="text-xl font-display font-bold text-white">Confirmar Viagem</h2>
                         <button onClick={handleCancelPreview} className="text-sm text-text-secondary hover:text-white underline">
                             Alterar
                         </button>
                    </div>

                    <div className="bg-[#1e1f29] rounded-xl border border-[#44475a] p-4 mb-4 flex justify-between items-center">
                        <div className="text-center">
                            <p className="text-xs text-[#6272a4] uppercase font-bold">Tempo</p>
                            <p className="text-lg font-bold text-white">{routeDetails.durationText}</p>
                        </div>
                        <div className="h-8 w-px bg-[#44475a]"></div>
                        <div className="text-center">
                            <p className="text-xs text-[#6272a4] uppercase font-bold">Distância</p>
                            <p className="text-lg font-bold text-white">{routeDetails.distanceText}</p>
                        </div>
                        <div className="h-8 w-px bg-[#44475a]"></div>
                        <div className="text-center">
                            <p className="text-xs text-[#6272a4] uppercase font-bold">Preço</p>
                            <p className="text-lg font-bold text-neon-green">R$ {routeDetails.price.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* PAYMENT METHOD SELECTOR */}
                    <div className="mb-4">
                        <p className="text-xs text-text-secondary uppercase font-bold mb-1">Como você vai pagar?</p>
                        <PaymentMethodSelector 
                            selected={paymentMethod} 
                            onChange={setPaymentMethod} 
                        />
                    </div>

                    <div className="space-y-3 mb-6 text-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-white ring-4 ring-[#1e1f29]"></div>
                            <p className="truncate text-text-secondary">{origin.address}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-sm bg-neon-green ring-4 ring-[#1e1f29]"></div>
                            <p className="truncate text-white font-medium">{destination.address}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <Button 
                            variant="secondary" 
                            className="col-span-1" 
                            onClick={handleCancelPreview}
                        >
                            Voltar
                        </Button>
                        <Button 
                            className="col-span-2 font-bold shadow-neon-sm" 
                            isLoading={isRequesting}
                            onClick={handleConfirmRideClick}
                        >
                            Confirmar
                        </Button>
                    </div>
                </Card>
            </div>
        ) : (
            <div className="w-full max-w-md mx-auto md:mx-0 pointer-events-auto">
                <Card className="bg-[#282a36]/95 backdrop-blur-xl border border-[#44475a] shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                    <div className="mb-4">
                        <h2 className="text-xl font-display font-bold text-white">Solicitar Viagem</h2>
                        <p className="text-xs text-text-secondary flex items-center gap-1 mt-1">
                             <span className="text-neon-green">●</span> {nearbyCars.length} motoristas online
                        </p>
                    </div>

                    <form onSubmit={handlePreviewRoute} className="space-y-4">
                        <div className="relative">
                            <div className="absolute left-3 top-8 bottom-8 w-0.5 bg-[#44475a] z-0"></div>
                            
                            <div className="mb-3">
                                <LocationInput 
                                    placeholder="Local de partida"
                                    value={origin.address}
                                    onChange={(val) => setOrigin(prev => ({ ...prev, address: val }))}
                                    onSelect={(loc) => setOrigin(loc)}
                                    iconColor="bg-text-secondary"
                                    rightElement={
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsLocating(true);
                                                navigator.geolocation.getCurrentPosition(
                                                    async (pos) => {
                                                        const res = await api.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
                                                        if(res.data) setOrigin({address: res.data, coords: {lat: pos.coords.latitude, lng: pos.coords.longitude, address: res.data}});
                                                        setIsLocating(false);
                                                    }, 
                                                    () => setIsLocating(false)
                                                )
                                            }}
                                            disabled={isLocating}
                                            className="p-1.5 text-[#6272a4] hover:text-white transition-colors"
                                        >
                                            {isLocating ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7-7 7z"/></svg>}
                                        </button>
                                    }
                                />
                            </div>

                            <div>
                                <LocationInput 
                                    placeholder="Para onde vamos?"
                                    value={destination.address}
                                    onChange={(val) => setDestination(prev => ({ ...prev, address: val }))}
                                    onSelect={(loc) => setDestination(loc)}
                                    iconColor="bg-neon-green"
                                />
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full font-bold shadow-neon-sm" 
                            isLoading={calculatingRoute}
                            disabled={!origin.address || !destination.address}
                        >
                            Ver Preço e Rota
                        </Button>
                    </form>
                </Card>
            </div>
        )}
      </div>
    </div>
  );
};
