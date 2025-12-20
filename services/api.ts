import { User, UserRole, Ride, RideStatus, ApiResponse, VerificationStatus, RouteDetails, PaymentMethod, AvailableRidesResponse } from '../types';

const API_DOMAIN = 'app.melevabr.com.br:3333';
const API_URL = `http://${API_DOMAIN}`;

const STORAGE_KEYS = {
  TOKEN: 'urbanride_token',
  USER: 'urbanride_user'
};

const fromApiUser = (data: any): User => ({
    id: Number(data.id),
    name: data.name,
    email: data.email,
    role: data.role as UserRole,
    prepaidCredits: parseFloat(data.prepaid_credits || 0),
    payableBalance: parseFloat(data.payable_balance || 0),
    rating: parseFloat(data.rating || 5),
    carModel: data.car_model,
    licensePlate: data.license_plate,
    verificationStatus: (data.verification_status || 'UNVERIFIED') as VerificationStatus,
    documents: {
        profile: data.profile_photo,
        cnh: data.cnh_document,
        crlv: data.crlv_document
    },
    cpf: data.cpf,
    phone: data.phone,
    birthDate: data.birth_date,
    rejectionReason: data.rejection_reason
});

const fromApiRide = (data: any): Ride => ({
    id: Number(data.id),
    passengerId: Number(data.passenger_id),
    passengerName: data.passenger_name || 'Passageiro',
    driverId: data.driver_id ? Number(data.driver_id) : undefined,
    driverName: data.driver_name,
    driverCarModel: data.driver_car_model,
    driverLicensePlate: data.driver_license_plate,
    origin: data.origin_address,
    destination: data.destination_address,
    price: parseFloat(data.price),
    distanceKm: parseFloat(data.distance_km),
    status: data.status as RideStatus,
    paymentMethod: data.payment_method as PaymentMethod,
    messages: data.messages?.map((m: any) => ({
        id: Number(m.id),
        rideId: Number(m.ride_id),
        senderId: Number(m.sender_id),
        content: m.content,
        timestamp: new Date(m.created_at).getTime(),
        isRead: !!m.is_read
    })) || [],
    createdAt: new Date(data.created_at).getTime(),
    startedAt: data.started_at ? new Date(data.started_at).getTime() : undefined,
    completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined,
    cancelReason: data.cancel_reason
});

const request = async <T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${API_URL}${cleanPath}`;

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            localStorage.clear();
            return { success: false, message: "Sessão expirada." };
        }
        const json = await response.json();
        return response.ok ? { success: true, data: json } : { success: false, message: json.message || `Erro ${response.status}` };
    } catch (error) {
        return { success: false, message: "Erro de conexão com o servidor." };
    }
};

export const api = {
    async login(email: string, password?: string): Promise<ApiResponse<User>> {
        const res = await request<any>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        if (res.success && res.data) {
            const token = res.data.token;
            const userData = fromApiUser(res.data.user);
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
            return { success: true, data: userData, token };
        }
        return res;
    },
    async loginWithGoogle(role: UserRole): Promise<ApiResponse<User>> {
        return { success: false, message: "Login com Google em desenvolvimento para a porta 3333." };
    },
    async register(name: string, email: string, role: UserRole, password?: string): Promise<ApiResponse<User>> {
        const res = await request<any>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, role, password }) });
        if (res.success && res.data) {
            const token = res.data.token;
            const userData = fromApiUser(res.data.user);
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
            return { success: true, data: userData, token };
        }
        return res;
    },
    async getSession(): Promise<User | null> {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    },
    async logout() { localStorage.clear(); },
    async getDriverData(id: number | string): Promise<User | null> {
        const res = await request<any>(`/users/${id}`);
        return res.success ? fromApiUser(res.data) : null;
    },
    async updateUserProfile(userId: number | string, data: any): Promise<ApiResponse<User>> {
        return request<any>(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }).then(res => res.success ? { success: true, data: fromApiUser(res.data) } : res);
    },
    async requestRide(passengerId: number | string, origin: string, destination: string, price: number, dist: number, paymentMethod: PaymentMethod): Promise<ApiResponse<Ride>> {
        return request<any>('/rides', { method: 'POST', body: JSON.stringify({ originAddress: origin, destinationAddress: destination, price, distanceKm: dist, paymentMethod }) }).then(res => res.success ? { success: true, data: fromApiRide(res.data) } : res);
    },
    async getAvailableRides(driverId: number | string): Promise<ApiResponse<AvailableRidesResponse>> {
        const res = await request<any[]>(`/rides/available?driverId=${driverId}`);
        if (res.success && res.data) {
            return { success: true, data: { rides: res.data.map(fromApiRide) } };
        }
        return { success: false, data: { rides: [] } };
    },
    async acceptRide(driverId: number | string, rideId: number | string): Promise<ApiResponse<Ride>> {
        return request<any>(`/rides/${rideId}/accept`, { method: 'POST' }).then(res => res.success ? { success: true, data: fromApiRide(res.data) } : res);
    },
    async updateRideStatus(rideId: number | string, status: RideStatus, cancelReason?: string): Promise<ApiResponse<Ride>> {
        return request<any>(`/rides/${rideId}/status`, { method: 'PATCH', body: JSON.stringify({ status, cancelReason }) }).then(res => res.success ? { success: true, data: fromApiRide(res.data) } : res);
    },
    async getRideStatus(rideId: number | string): Promise<ApiResponse<Ride>> {
        const res = await request<any>(`/rides/${rideId}`);
        return res.success ? { success: true, data: fromApiRide(res.data) } : res;
    },
    async calculateRoute(origin: any, destination: any): Promise<ApiResponse<RouteDetails>> {
        return request<RouteDetails>(`/geo/route`, { method: 'POST', body: JSON.stringify({ origin, destination }) });
    },
    async uploadDriverDocument(userId: number | string, file: File, type: string): Promise<ApiResponse<User>> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const response = await fetch(`${API_URL}/users/${userId}/documents`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
        const json = await response.json();
        return response.ok ? { success: true, data: fromApiUser(json) } : { success: false, message: json.message };
    },
    async getDocumentUrl(fileId: string): Promise<string> { return `${API_URL}/documents/${fileId}`; },
    async submitForReview(userId: number | string): Promise<ApiResponse<User>> { return request<any>(`/users/${userId}/submit-review`, { method: 'POST' }).then(res => res.success ? { success: true, data: fromApiUser(res.data) } : res); },
    async adminForceApprove(userId: number | string): Promise<ApiResponse<User>> { return request<any>(`/users/${userId}/approve`, { method: 'POST' }).then(res => res.success ? { success: true, data: fromApiUser(res.data) } : res); },
    async resetDriverVerification(userId: number | string): Promise<ApiResponse<User>> { return request<any>(`/users/${userId}/reset-verification`, { method: 'POST' }).then(res => res.success ? { success: true, data: fromApiUser(res.data) } : res); },
    async generatePixCharge(amount: number): Promise<ApiResponse<any>> { return request<any>('/payments/pix/charge', { method: 'POST', body: JSON.stringify({ amount }) }); },
    async confirmPixPayment(userId: number | string, amount: number): Promise<ApiResponse<any>> { return request<any>('/payments/pix/confirm', { method: 'POST', body: JSON.stringify({ userId, amount }) }); }
};