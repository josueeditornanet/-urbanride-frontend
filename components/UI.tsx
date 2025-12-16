
import React, { useState, useEffect, useRef } from 'react';

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success' | 'warning';
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', size = 'md', isLoading, className = '', disabled, ...props 
}) => {
  const base = "rounded-xl font-display font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#282a36] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.95] tracking-wide touch-manipulation";
  
  const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg"
  };

  const variants = {
    primary: "bg-gradient-to-br from-neon-green to-neon-green-hover text-[#282a36] shadow-neon-md hover:shadow-neon-lg hover:-translate-y-1 focus:ring-neon-green border-none",
    success: "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 border-none",
    warning: "bg-amber-500 hover:bg-amber-400 text-[#282a36] shadow-lg shadow-amber-500/30 border-none",
    secondary: "bg-[#44475a] text-text-primary hover:bg-[#6272a4] hover:text-white shadow-md focus:ring-[#6272a4]",
    danger: "bg-dracula-red text-white hover:bg-red-600 shadow-md shadow-red-500/20 focus:ring-dracula-red",
    outline: "bg-transparent border-2 border-[#44475a] text-text-primary hover:border-neon-green hover:text-neon-green hover:shadow-neon-sm focus:ring-neon-green",
    ghost: "bg-transparent text-text-secondary hover:text-white hover:bg-[#44475a]/30"
  };

  return (
    <button 
      className={`${base} ${sizes[size]} ${variants[variant]} ${className} flex items-center justify-center`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
  <div className="mb-5 w-full">
    {label && <label className="block text-sm font-medium text-text-secondary mb-2 ml-1">{label}</label>}
    <input 
      className={`w-full px-4 py-3 bg-[#282a36] border rounded-xl focus:outline-none focus:ring-2 focus:shadow-[0_0_0_3px_rgba(80,250,123,0.2)] transition-all text-base text-text-primary placeholder-[#6272a4] ${
        error 
          ? 'border-dracula-red focus:border-dracula-red focus:ring-dracula-red/20' 
          : 'border-[#44475a] focus:border-neon-green focus:ring-neon-green'
      } ${className}`}
      {...props}
    />
    {error && <p className="text-xs text-dracula-red mt-1.5 ml-1 flex items-center gap-1">
      <span className="inline-block w-1 h-1 rounded-full bg-dracula-red"></span>
      {error}
    </p>}
  </div>
);

// --- STAR RATING (NEW) ---
export const StarRating: React.FC<{ rating: number; onChange: (rating: number) => void; readOnly?: boolean; size?: 'sm' | 'md' | 'lg' }> = ({ rating, onChange, readOnly, size = 'md' }) => {
    const [hover, setHover] = useState(0);
    
    const sizeClasses = {
        sm: "w-5 h-5",
        md: "w-8 h-8",
        lg: "w-12 h-12"
    };

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= (hover || rating);
                return (
                    <button
                        key={star}
                        type="button"
                        disabled={readOnly}
                        onClick={() => onChange(star)}
                        onMouseEnter={() => !readOnly && setHover(star)}
                        onMouseLeave={() => !readOnly && setHover(rating)}
                        className={`transition-all duration-200 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} focus:outline-none`}
                    >
                        <svg 
                            className={`${sizeClasses[size]} ${isActive ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'text-[#44475a] fill-transparent'}`} 
                            viewBox="0 0 24 24"
                            stroke="currentColor" 
                            strokeWidth={isActive ? "0" : "2"}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </button>
                );
            })}
        </div>
    );
};

// --- CHAT COMPONENTS (NEW) ---

export const ChatButton: React.FC<{ hasUnread: boolean; onClick: () => void }> = ({ hasUnread, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className={`
                fixed bottom-24 right-4 z-50 p-4 rounded-full shadow-2xl transition-all duration-300
                ${hasUnread 
                    ? 'bg-[#282a36] text-dracula-pink border-2 border-dracula-pink animate-pulse shadow-[0_0_20px_rgba(255,121,198,0.5)]' 
                    : 'bg-[#44475a] text-white hover:bg-[#6272a4]'}
            `}
        >
            <div className="relative">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-dracula-pink rounded-full border border-[#282a36]"></span>
                )}
            </div>
        </button>
    );
};

export const ChatSheet: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    messages: any[];
    currentUserId: string;
    onSendMessage: (msg: string) => void;
    role: 'DRIVER' | 'PASSENGER';
}> = ({ isOpen, onClose, messages, currentUserId, onSendMessage, role }) => {
    const [inputText, setInputText] = useState('');
    const [showKeyboard, setShowKeyboard] = useState(role === 'PASSENGER'); // Drivers start with chips
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new message
    useEffect(() => {
        if (isOpen && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    if (!isOpen) return null;

    const DRIVER_CHIPS = [
        "Estou a caminho 🚗",
        "Cheguei ao local 📍",
        "Trânsito intenso 🚦",
        "Não encontro o número 🏠",
        "Ok, entendido 👍"
    ];

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#282a36] w-full sm:max-w-md h-[80vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl border border-[#44475a] shadow-2xl flex flex-col animate-slide-up">
                
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-[#44475a] bg-[#1e1f29] rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${role === 'DRIVER' ? 'bg-neon-green text-[#282a36]' : 'bg-dracula-purple text-white'}`}>
                            {role === 'DRIVER' ? 'P' : 'M'}
                        </div>
                        <div>
                            <h3 className="font-bold text-white">{role === 'DRIVER' ? 'Passageiro' : 'Motorista'}</h3>
                            <p className="text-xs text-text-secondary">Chat da Corrida</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#44475a] rounded-full text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Messages Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#282a36]">
                    {messages.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <p className="text-sm text-text-secondary">Inicie a conversa...</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.senderId === currentUserId;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                                        isMe 
                                        ? 'bg-neon-green text-[#282a36] rounded-tr-none font-medium' 
                                        : 'bg-[#44475a] text-white rounded-tl-none'
                                    }`}>
                                        {msg.content}
                                        <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-[#282a36]/70' : 'text-text-secondary'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Input Area */}
                <div className="p-3 bg-[#1e1f29] border-t border-[#44475a] pb-safe">
                    {/* Driver Chips */}
                    {role === 'DRIVER' && !showKeyboard && (
                        <div className="mb-3">
                            <div className="flex flex-wrap gap-2 justify-center">
                                {DRIVER_CHIPS.map(chip => (
                                    <button 
                                        key={chip} 
                                        onClick={() => onSendMessage(chip)}
                                        className="bg-[#44475a] hover:bg-[#6272a4] text-white text-xs py-2 px-3 rounded-full border border-[#6272a4]/50 transition-colors"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                            <button 
                                onClick={() => setShowKeyboard(true)} 
                                className="w-full mt-3 text-xs text-text-secondary underline hover:text-white"
                            >
                                Digitar mensagem manualmente
                            </button>
                        </div>
                    )}

                    {/* Standard Keyboard Input */}
                    {(role === 'PASSENGER' || showKeyboard) && (
                        <div className="flex gap-2">
                             {role === 'DRIVER' && (
                                <button onClick={() => setShowKeyboard(false)} className="p-2 text-text-secondary">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </button>
                             )}
                             <input 
                                className="flex-1 bg-[#282a36] border border-[#44475a] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-neon-green"
                                placeholder="Digite aqui..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                             />
                             <button 
                                onClick={handleSend}
                                disabled={!inputText.trim()}
                                className="bg-neon-green text-[#282a36] p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" /></svg>
                             </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- CARD ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ 
  children, className = '', title 
}) => (
  <div className={`bg-dracula-elevated rounded-2xl shadow-xl border border-[#44475a] overflow-hidden ${className}`}>
    {title && (
      <div className="px-6 py-4 border-b border-[#44475a] bg-[#282a36]/50 backdrop-blur-sm">
        <h3 className="font-display font-semibold text-text-primary text-lg tracking-wide">{title}</h3>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

// --- MODAL ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ 
    isOpen, onClose, title, children 
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#282a36] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[#44475a] shadow-2xl relative animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b border-[#44475a] sticky top-0 bg-[#282a36] z-10">
                    <h3 className="text-lg font-bold text-text-primary">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-[#44475a] rounded-full text-text-secondary hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

// --- BADGE ---
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    REQUESTED: "bg-dracula-yellow/20 text-dracula-yellow border-dracula-yellow/30",
    ACCEPTED: "bg-dracula-cyan/20 text-dracula-cyan border-dracula-cyan/30",
    // MODIFICAÇÃO: Green Flash style (Alto Contraste)
    DRIVER_ARRIVED: "bg-neon-green text-[#282a36] border-neon-green animate-pulse font-black shadow-[0_0_15px_rgba(80,250,123,0.5)]", 
    RUNNING: "bg-dracula-purple/20 text-dracula-purple border-dracula-purple/30 animate-pulse-slow",
    COMPLETED: "bg-neon-green/20 text-neon-green border-neon-green/30",
    CANCELLED: "bg-dracula-red/20 text-dracula-red border-dracula-red/30",
  };

  const labels: Record<string, string> = {
    REQUESTED: "SOLICITADO",
    ACCEPTED: "ACEITO",
    DRIVER_ARRIVED: "MOTORISTA CHEGOU", 
    RUNNING: "EM CURSO",
    COMPLETED: "FINALIZADA",
    CANCELLED: "CANCELADA"
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${styles[status] || 'bg-gray-100'}`}>
      {labels[status] || status}
    </span>
  );
};
