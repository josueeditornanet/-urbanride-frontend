import { User, UserRole, Ride, RideStatus, Transaction, ApiResponse, VerificationStatus, GeoLocation, RouteDetails, PaymentMethod, ChatMessage } from '../types';

// --- CONFIGURAÇÃO DE SEGURANÇA ---
const ENABLE_FINANCIAL_BLOCK = true;
const FEE_PERCENTAGE = 0.10; // 10% sobre o valor da corrida

const API_URL = import.meta.env.VITE_API_URL;

// Função auxiliar para obter token de autorização
const getAuthHeaders = () => {
  const token = localStorage.getItem('urbanride_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// Função auxiliar para lidar com erros de resposta
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Erro de rede' }));
    throw new Error(errorData.message || `Erro ${response.status}`);
  }
  return response.json();
};

export const api = {
  // --- AUTH & MIGRAÇÃO ---
  async login(email: string): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const result = await handleResponse(response);
      
      if (result.success && result.data) {
        // Armazena token se fornecido pelo backend
        if (result.token) {
          localStorage.setItem('urbanride_token', result.token);
        }
        // Armazena dados do usuário
        localStorage.setItem('urbanride_session', JSON.stringify(result.data));
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: (error as Error).message };
    }
  },

  async getSession(): Promise<User | null> {
      const s = localStorage.getItem('urbanride_session');
      return s ? JSON.parse(s) : null;
  },

  async getDriverData(id: string) {
      try {
        const response = await fetch(`${API_URL}/users/${id}`, {
          headers: getAuthHeaders(),
        });
        const result = await handleResponse(response);
        return result.data;
      } catch (error) {
        console.error('Get driver data error:', error);
        return null;
      }
  },

  // --- MÉTODOS FINANCEIROS ---
  async getWalletHistory(userId: string): Promise<Transaction[]> {
      try {
        const response = await fetch(`${API_URL}/wallet/history/${userId}`, {
          headers: getAuthHeaders(),
        });
        const result = await handleResponse(response);
        return result.data || [];
      } catch (error) {
        console.error('Get wallet history error:', error);
        return [];
      }
  },

  async generatePixCharge(amount: number): Promise<ApiResponse<any>> {
      try {
        const response = await fetch(`${API_URL}/payment/pix`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ amount }),
        });
        const result = await handleResponse(response);
        return result;
      } catch (error) {
        console.error('Generate PIX charge error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  async confirmPixPayment(userId: string, amount: number): Promise<ApiResponse<User>> {
      try {
        const response = await fetch(`${API_URL}/payment/pix/confirm`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ userId, amount }),
        });
        const result = await handleResponse(response);
        
        if (result.success && result.data) {
          localStorage.setItem('urbanride_session', JSON.stringify(result.data));
        }
        
        return result;
      } catch (error) {
        console.error('Confirm PIX payment error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  // --- FLUXO DE CORRIDA ---
  async acceptRide(driverId: string, rideId: string): Promise<ApiResponse<Ride>> {
      try {
        const response = await fetch(`${API_URL}/rides/${rideId}/accept`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ driverId }),
        });
        const result = await handleResponse(response);
        
        // Atualiza sessão se o usuário for um motorista com saldo insuficiente
        if (result.message === "SALDO_INSUFICIENTE") {
          // O backend deve retornar o status de saldo insuficiente
          return result;
        }

        if (result.success && result.data) {
          // Atualiza sessão local se necessário
          const currentSession = localStorage.getItem('urbanride_session');
          if (currentSession) {
            const sessionUser = JSON.parse(currentSession);
            if (sessionUser.id === driverId && result.data.driverId) {
              // Atualiza o usuário na sessão com informações atualizadas
              localStorage.setItem('urbanride_session', JSON.stringify({
                ...sessionUser,
                prepaidCredits: sessionUser.prepaidCredits // o backend já teria atualizado o valor
              }));
            }
          }
        }
        
        return result;
      } catch (error) {
        console.error('Accept ride error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  async register(name: string, email: string, role: UserRole): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, role: role.toUpperCase() as UserRole }),
      });
      
      const result = await handleResponse(response);
      
      if (result.success && result.data) {
        // Armazena token se fornecido pelo backend
        if (result.token) {
          localStorage.setItem('urbanride_token', result.token);
        }
        // Armazena dados do usuário
        localStorage.setItem('urbanride_session', JSON.stringify(result.data));
      }
      
      return result;
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: (error as Error).message };
    }
  },

  async loginWithGoogle(role: UserRole): Promise<ApiResponse<User>> {
      try {
        const response = await fetch(`${API_URL}/auth/google`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ role: role.toUpperCase() as UserRole }),
        });
        const result = await handleResponse(response);
        
        if (result.success && result.data) {
          // Armazena token se fornecido pelo backend
          if (result.token) {
            localStorage.setItem('urbanride_token', result.token);
          }
          // Armazena dados do usuário
          localStorage.setItem('urbanride_session', JSON.stringify(result.data));
        }
        
        return result;
      } catch (error) {
        console.error('Google login error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  async logout() {
    localStorage.removeItem('urbanride_token');
    localStorage.removeItem('urbanride_session');
  },

  async updateUserProfile(id: string, data: any) {
      try {
        const response = await fetch(`${API_URL}/users/${id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        const result = await handleResponse(response);
        
        if (result.success && result.data) {
          // Atualiza sessão local se for o mesmo usuário
          const currentSession = localStorage.getItem('urbanride_session');
          if (currentSession) {
            const sessionUser = JSON.parse(currentSession);
            if (sessionUser.id === id) {
              localStorage.setItem('urbanride_session', JSON.stringify(result.data));
            }
          }
        }
        
        return result;
      } catch (error) {
        console.error('Update user profile error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  async requestRide(passengerId: string, origin: string, destination: string, price: number, dist: number, paymentMethod: PaymentMethod): Promise<ApiResponse<Ride>> {
      try {
        const response = await fetch(`${API_URL}/rides`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            passengerId,
            origin,
            destination,
            price,
            distanceKm: dist,
            paymentMethod: paymentMethod || PaymentMethod.CASH,
          }),
        });
        const result = await handleResponse(response);
        
        return result;
      } catch (error) {
        console.error('Request ride error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  async getAvailableRides(driverId: string): Promise<ApiResponse<{rides: Ride[], debug?: any}>> {
      try {
        const response = await fetch(`${API_URL}/rides/available?driverId=${driverId}`, {
          headers: getAuthHeaders(),
        });
        const result = await handleResponse(response);
        return result;
      } catch (error) {
        console.error('Get available rides error:', error);
        return { success: false, rides: [] };
      }
  },

  async getDriverActiveRide(driverId: string): Promise<ApiResponse<Ride | null>> {
      try {
        const response = await fetch(`${API_URL}/rides/active?driverId=${driverId}`, {
          headers: getAuthHeaders(),
        });
        const result = await handleResponse(response);
        return result;
      } catch (error) {
        console.error('Get driver active ride error:', error);
        return { success: false, data: null };
      }
  },

  async getRideStatus(rideId: string): Promise<ApiResponse<Ride>> {
      try {
        const response = await fetch(`${API_URL}/rides/${rideId}`, {
          headers: getAuthHeaders(),
        });
        const result = await handleResponse(response);
        return result;
      } catch (error) {
        console.error('Get ride status error:', error);
        return { success: false, data: null };
      }
  },

  async updateRideStatus(rideId: string, status: RideStatus, cancelReason?: string): Promise<ApiResponse<Ride>> {
      try {
        const response = await fetch(`${API_URL}/rides/${rideId}/status`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status, cancelReason }),
        });
        const result = await handleResponse(response);
        
        // Atualiza sessão local se a corrida for finalizada e afetar o saldo do motorista
        if (result.success && result.data && status === RideStatus.COMPLETED) {
          const currentSession = localStorage.getItem('urbanride_session');
          if (currentSession) {
            const sessionUser = JSON.parse(currentSession);
            if (sessionUser.id === result.data.driverId) {
              // O backend deve retornar o usuário atualizado com os saldos corretos
              // Atualiza a sessão local com os dados mais recentes
              const updatedUser = await this.getDriverData(sessionUser.id);
              if (updatedUser) {
                localStorage.setItem('urbanride_session', JSON.stringify(updatedUser));
              }
            }
          }
        }
        
        return result;
      } catch (error) {
        console.error('Update ride status error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  async rateRide(rideId: string, targetId: string, rating: number, shouldBlock?: boolean, reporterId?: string): Promise<ApiResponse<any>> {
      try {
        const response = await fetch(`${API_URL}/rides/${rideId}/rating`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ targetId, rating, shouldBlock, reporterId }),
        });
        const result = await handleResponse(response);
        return result;
      } catch (error) {
        console.error('Rate ride error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  // --- CHAT SYSTEM ---
  async sendMessage(rideId: string, senderId: string, content: string): Promise<ApiResponse<Ride>> {
      try {
        const response = await fetch(`${API_URL}/chat/send`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ rideId, senderId, content }),
        });
        const result = await handleResponse(response);
        return result;
      } catch (error) {
        console.error('Send message error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  async markMessagesAsRead(rideId: string, readerId: string): Promise<void> {
      try {
        const response = await fetch(`${API_URL}/chat/${rideId}/read`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ readerId }),
        });
        await handleResponse(response);
      } catch (error) {
        console.error('Mark messages as read error:', error);
      }
  },

  async searchPlaces(q: string) {
      try {
        if(!q) return { success: true, data: [] };
        
        // Este endpoint pode ser implementado no backend para lidar com geocodificação
        const response = await fetch(`${API_URL}/maps/search?q=${encodeURIComponent(q)}`, {
          headers: getAuthHeaders(),
        });
        const result = await handleResponse(response);
        return result;
      } catch (error) {
        console.error('Search places error:', error);
        return { success: false, data: [] };
      }
  },

  async calculateRoute(a: any, b: any) {
      try {
        const response = await fetch(`${API_URL}/maps/route`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ origin: a, destination: b }),
        });
        const result = await handleResponse(response);
        return result;
      } catch (error) {
        console.error('Calculate route error:', error);
        return { success: false, data: null };
      }
  },

  async reverseGeocode(lat?: number, lng?: number) {
      try {
        if(lat === undefined || lng === undefined) {
          return { success: true, data: "Coordenadas não fornecidas" };
        }
        
        const response = await fetch(`${API_URL}/maps/reverse?lat=${lat}&lng=${lng}`, {
          headers: getAuthHeaders(),
        });
        const result = await handleResponse(response);
        return result;
      } catch (error) {
        console.error('Reverse geocode error:', error);
        return { success: false, data: null };
      }
  },

  // Funções auxiliares que não precisam de backend real (ainda)
  async forceResetDatabase() {
    localStorage.clear();
    window.location.reload();
  },

  async generateQrCode() { return { success: true }; },
  async checkPaymentStatus() { return { success: true }; },

  async uploadDriverDocument(userId: string, file: File, type: 'cnh' | 'crlv' | 'profile'): Promise<ApiResponse<User>> {
      try {
        // Para upload de arquivos, precisamos usar FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        
        const response = await fetch(`${API_URL}/documents/upload`, {
          method: 'POST',
          headers: {
            // Não incluir Content-Type para que o navegador defina automaticamente com boundary
            'Authorization': `Bearer ${localStorage.getItem('urbanride_token')}`,
          },
          body: formData,
        });
        
        const result = await handleResponse(response);
        
        if (result.success && result.data) {
          // Atualiza sessão local se for o mesmo usuário
          const currentSession = localStorage.getItem('urbanride_session');
          if (currentSession) {
            const sessionUser = JSON.parse(currentSession);
            if (sessionUser.id === userId) {
              localStorage.setItem('urbanride_session', JSON.stringify(result.data));
            }
          }
        }
        
        return result;
      } catch (error) {
        console.error('Upload document error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  async submitForReview(userId: string): Promise<ApiResponse<User>> {
      try {
        const response = await fetch(`${API_URL}/users/${userId}/verify`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        const result = await handleResponse(response);
        
        if (result.success && result.data) {
          // Atualiza sessão local
          localStorage.setItem('urbanride_session', JSON.stringify(result.data));
        }
        
        return result;
      } catch (error) {
        console.error('Submit for review error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  async adminForceApprove(userId: string): Promise<ApiResponse<User>> {
      try {
        const response = await fetch(`${API_URL}/admin/users/${userId}/approve`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        const result = await handleResponse(response);
        
        if (result.success && result.data) {
          // Atualiza sessão local
          localStorage.setItem('urbanride_session', JSON.stringify(result.data));
        }
        
        return result;
      } catch (error) {
        console.error('Admin force approve error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  async adminForceReject(userId: string, reason: string): Promise<ApiResponse<User>> {
      try {
        const response = await fetch(`${API_URL}/admin/users/${userId}/reject`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ reason }),
        });
        const result = await handleResponse(response);
        
        if (result.success && result.data) {
          // Atualiza sessão local
          localStorage.setItem('urbanride_session', JSON.stringify(result.data));
        }
        
        return result;
      } catch (error) {
        console.error('Admin force reject error:', error);
        return { success: false, message: (error as Error).message };
      }
  },

  async getDocumentUrl(fileId: string) {
    // O backend deve retornar a URL do documento
    return `${API_URL}/documents/${fileId}`;
  },

  async resetDriverVerification(userId: string): Promise<ApiResponse<User>> {
      try {
        const response = await fetch(`${API_URL}/users/${userId}/reset-verification`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        const result = await handleResponse(response);
        
        if (result.success && result.data) {
          // Atualiza sessão local
          localStorage.setItem('urbanride_session', JSON.stringify(result.data));
        }
        
        return result;
      } catch (error) {
        console.error('Reset driver verification error:', error);
        return { success: false, message: (error as Error).message };
      }
  }
};