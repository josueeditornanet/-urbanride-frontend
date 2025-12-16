
import { useRef, useCallback } from 'react';

export const useSoundSystem = () => {
    // Mantém uma referência única ao contexto de áudio
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Inicializa o contexto (Deve ser chamado por interação do usuário)
    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            // @ts-ignore - Compatibilidade com Safari antigo
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContext();
        }
        
        // Se estiver suspenso (padrão dos navegadores), retoma
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    // Som 1: Notificação de Nova Corrida (Tom duplo "Bi-Bi" estilo app de transporte)
    const playNewRideSound = useCallback(() => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;

        // Cria oscilador
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Configuração do som (Onda Quadrada para chamar atenção)
        osc.type = 'square';
        
        // Melodia: High -> Low -> High
        const now = ctx.currentTime;
        
        // Nota 1
        osc.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0.1, now);
        
        // Pausa breve
        gainNode.gain.setValueAtTime(0, now + 0.1);
        
        // Nota 2
        osc.frequency.setValueAtTime(800, now + 0.2);
        gainNode.gain.setValueAtTime(0.1, now + 0.2);
        
        // Fade out final
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        osc.start(now);
        osc.stop(now + 0.6);
    }, []);

    // Som 2: Notificação de Chat (Tom suave "Pop")
    const playMessageSound = useCallback(() => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.type = 'sine'; // Senoidal é mais suave para mensagens
        
        const now = ctx.currentTime;
        
        // Efeito "Drop" de frequência
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
        
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.2);
    }, []);

    return {
        initAudio,
        playNewRideSound,
        playMessageSound
    };
};
