/**
 * ConsultaMed Frontend - Auth Store
 *
 * Estado de autenticación del usuario, persistido en localStorage.
 */

import type { Practitioner } from "@/types/api";

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

const STORAGE_KEY = "consultamed_auth";

let state: AuthState = {
  token: null,
  practitioner: null,
  isAuthenticated: false,
};

export const authStore: AuthStore = {
  get token() {
    return state.token;
  },
  get practitioner() {
    return state.practitioner;
  },
  get isAuthenticated() {
    return state.isAuthenticated;
  },

  login(token: string, practitioner: Practitioner) {
    state = {
      token,
      practitioner,
      isAuthenticated: true,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, practitioner }));
    }
  },

  logout() {
    state = {
      token: null,
      practitioner: null,
      isAuthenticated: false,
    };
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  loadFromStorage() {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const { token, practitioner } = JSON.parse(stored);
      state = {
        token,
        practitioner,
        isAuthenticated: true,
      };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
};
