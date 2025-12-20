import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Ride, RideStatus } from '../types';
import { Button, Card, Modal, StatusBadge } from '../components/UI';
import { useSoundSystem } from '../hooks/useSoundSystem';

export const DriverDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { initAudio, playNewRideSound } = useSoundSystem();
  const [isOnline, setIsOnline] = useState(false);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  useEffect(() => {
    let interval: any;
    if (isOnline && !activeRide) {
      interval = setInterval(async () => {
        const res = await api.getAvailableRides(user!.id);
        if (res.success && res.data && res.data.rides) {
            if (res.data.rides.length > availableRides.length) {
                playNewRideSound();
            }
            setAvailableRides(res.data.rides);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isOnline, activeRide, availableRides.length]);

  const handleAccept = async (rideId: number) => {
    const res = await api.acceptRide(user!.id, rideId);
    if (res.success && res.data) setActiveRide(res.data);
    else alert(res.message || "Erro ao aceitar corrida");
  };

  const updateStatus = async (status: RideStatus) => {
    const res = await api.updateRideStatus(activeRide!.id, status);
    if (res.success && res.data) {
      setActiveRide(res.data);
      if (status === RideStatus.COMPLETED) {
        setActiveRide(null);
        refreshUser();
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center bg-[#282a36] p-4 rounded-xl border border-[#44475a]">
        <div>
          <p className="text-xs text-text-secondary uppercase">Saldo para Taxas</p>
          <p className="text-xl font-bold text-neon-green">R$ {user?.prepaidCredits.toFixed(2)}</p>
        </div>
        <button onClick={() => { initAudio(); setIsOnline(!isOnline); }} className={`px-6 py-2 rounded-full font-bold transition-all ${isOnline ? 'bg-dracula-red text-white' : 'bg-neon-green text-[#282a36]'}`}>
          {isOnline ? 'FICAR OFFLINE' : 'FICAR ONLINE'}
        </button>
      </div>

      {activeRide ? (
        <Card title="Corrida Ativa">
          <p className="text-white mb-4">{activeRide.origin} -> {activeRide.destination}</p>
          <div className="space-y-3">
            {activeRide.status === RideStatus.ACCEPTED && <Button className="w-full" onClick={() => updateStatus(RideStatus.DRIVER_ARRIVED)}>Cheguei</Button>}
            {activeRide.status === RideStatus.DRIVER_ARRIVED && <Button className="w-full" onClick={() => updateStatus(RideStatus.RUNNING)}>Iniciar Viagem</Button>}
            {activeRide.status === RideStatus.RUNNING && <Button className="w-full" variant="success" onClick={() => updateStatus(RideStatus.COMPLETED)}>Finalizar e Receber</Button>}
          </div>
        </Card>
      ) : isOnline && (
        <div className="space-y-4">
          <p className="text-xs text-[#6272a4] animate-pulse">Buscando passageiros próximos...</p>
          {availableRides.map(ride => (
            <Card key={ride.id} className="border-neon-green/30">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-white">R$ {ride.price.toFixed(2)}</h3>
                <span className="text-text-secondary">{ride.distanceKm} km</span>
              </div>
              <Button className="w-full" onClick={() => handleAccept(ride.id)}>Aceitar Agora</Button>
            </Card>
          ))}
          {availableRides.length === 0 && (
              <div className="text-center py-10 opacity-30">
                  <p className="text-sm">Nenhuma corrida disponível no momento</p>
              </div>
          )}
        </div>
      )}
    </div>
  );
};