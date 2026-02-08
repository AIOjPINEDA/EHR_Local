/**
 * ConsultaMed Frontend - Auth Store (Zustand)
 * 
 * Estado de autenticación del usuario.
 */

interface Practitioner {
  id: string;
  identifier_value: string;
  name_given: string;
  name_family: string;
  qualification_code: string | null;
  telecom_email: string | null;
}

interface AuthState {
  token: string | null;
  practitioner: Practitioner | null;
  isAuthenticated: boolean;
}

interface AuthStore extends AuthState {
  login: (token: string, practitioner: Practitioner) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

const STORAGE_KEY = 'consultamed_auth';

// Simple store sin Zustand para simplicidad MVP
let state: AuthState = {
  token: null,
  practitioner: null,
  isAuthenticated: false,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(listener => listener());
}

export const authStore: AuthStore = {
  get token() { return state.token; },
  get practitioner() { return state.practitioner; },
  get isAuthenticated() { return state.isAuthenticated; },
  
  login(token: string, practitioner: Practitioner) {
    state = {
      token,
      practitioner,
      isAuthenticated: true,
    };
    // Guardar en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, practitioner }));
    }
    notify();
  },
  
  logout() {
    state = {
      token: null,
      practitioner: null,
      isAuthenticated: false,
    };
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    notify();
  },
  
  loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { token, practitioner } = JSON.parse(stored);
        state = {
          token,
          practitioner,
          isAuthenticated: true,
        };
        notify();
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  },
};

// Hook para React
export function useAuth() {
  // Este hook es simplificado - en producción usar Zustand con useStore
  return authStore;
}
