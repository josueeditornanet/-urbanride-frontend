
// Data Models matching the domain logic

export enum UserRole {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER'
}

export enum RideStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  DRIVER_ARRIVED = 'DRIVER_ARRIVED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD'
}

// Prepare for Google Maps Coords
export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

// NEW: Structure for Route APIs (Google Directions API compatible structure)
export interface RouteDetails {
  polyline: GeoLocation[]; // Array of points to draw the line
  distanceText: string;    // "5.2 km"
  distanceValue: number;   // 5.2
  durationText: string;    // "14 mins"
  durationValue: number;   // 14 (minutes)
  price: number;
}

// --- CHAT SYSTEM ---
export interface ChatMessage {
    id: string;
    senderId: string;
    content: string;
    timestamp: number;
    isRead: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  
  // --- FINANCIAL SYSTEM (MODELO P2P / DIRETO) ---
  // O dinheiro da corrida vai direto do passageiro para o motorista.
  // O sistema apenas gerencia os créditos pré-pagos para cobrar a taxa.
  
  balance?: number; // @deprecated
  
  prepaidCredits: number; // "Combustível": Saldo recarregado via PIX para pagar taxas.
  
  payableBalance: number; // "Placar": Estatística de quanto o motorista já faturou na vida. 
                          // NÃO é um saldo sacável. Apenas histórico acumulado.
  
  isAvailable?: boolean; 
  
  // CONFIGURAÇÃO DO MOTORISTA (Maquininha)
  acceptedPaymentMethods?: PaymentMethod[];

  // Ratings & Safety
  rating?: number;       // Average rating (0-5)
  totalRatings?: number; // Count of ratings
  blockedUsers?: string[]; // IDs of users this person has blocked
  
  // Driver specific
  verificationStatus?: VerificationStatus;
  documents?: {
    cnh?: string;
    crlv?: string;
    profile?: string;
  };
  rejectionReason?: string;
  // VEHICLE DATA (NEW)
  carModel?: string;
  licensePlate?: string;

  // Passenger Specific (Progressive Profiling)
  cpf?: string;
  phone?: string;
  birthDate?: string;
}

export interface Ride {
  id: string;
  passengerId: string;
  passengerName: string;
  driverId?: string;
  driverName?: string;
  // VEHICLE SNAPSHOT (NEW) - Dados do carro no momento da corrida
  driverCarModel?: string;
  driverLicensePlate?: string;

  origin: string; // Keep simple string for UI, but backend would use GeoLocation
  destination: string;
  originCoords?: GeoLocation; // Prepared for future
  destCoords?: GeoLocation;   // Prepared for future
  price: number;
  distanceKm: number;
  status: RideStatus;
  
  // Pagamento escolhido pelo passageiro
  paymentMethod: PaymentMethod;

  // CHAT
  messages?: ChatMessage[];

  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  // Ratings
  driverRating?: number; // Rating given TO the driver
  passengerRating?: number; // Rating given TO the passenger

  // FINANCIAL CONTROL (NEW)
  refundProcessed?: boolean; // Flag de controle para estorno automático (Idempotência)
  
  // CANCELLATION INTELLIGENCE (NEW)
  cancelReason?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT' | 'EARNING' | 'FEE'; 
  description: string;
  date: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  metadata?: any; // Para guardar JSON do Mercado Pago futuramente
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  token?: string;
}

export interface AvailableRidesResponse {
  success: boolean;
  rides: Ride[];
  debug?: any;
  message?: string;
}