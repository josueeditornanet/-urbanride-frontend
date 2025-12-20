
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

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface RouteDetails {
  polyline: GeoLocation[];
  distanceText: string;
  distanceValue: number;
  durationText: string;
  durationValue: number;
  price: number;
}

export interface ChatMessage {
    id: number;
    rideId: number;
    senderId: number;
    content: string;
    timestamp: number;
    isRead: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  prepaidCredits: number;
  payableBalance: number;
  rating: number;
  carModel?: string;
  licensePlate?: string;
  verificationStatus: VerificationStatus;
  documents?: {
    cnh?: string;
    crlv?: string;
    profile?: string;
  };
  cpf?: string;
  phone?: string;
  birthDate?: string;
  rejectionReason?: string;
}

export interface Ride {
  id: number;
  passengerId: number;
  passengerName: string;
  driverId?: number;
  driverName?: string;
  driverCarModel?: string;
  driverLicensePlate?: string;
  origin: string;
  destination: string;
  price: number;
  distanceKm: number;
  status: RideStatus;
  paymentMethod: PaymentMethod;
  messages?: ChatMessage[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  cancelReason?: string;
}

export interface Transaction {
  id: number;
  userId: number;
  amount: number;
  type: 'CREDIT' | 'DEBIT' | 'EARNING' | 'FEE';
  description: string;
  date: number;
  metadata?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}