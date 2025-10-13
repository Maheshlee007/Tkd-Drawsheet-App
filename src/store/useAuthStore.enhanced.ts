import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

interface User {
  name: string;
  email?: string;
  picture?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (userData: User | string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  validateToken: () => boolean;
}

// Security utilities
const isTokenExpired = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    return true; // If can't decode, consider expired
  }
};

const generateSecureToken = (user: User): string => {
  // In a real app, this would be done on the server
  // For demo purposes, we'll create a simple token with expiry
  const payload = {
    user,
    iat: Math.floor(Date.now() / 1000), // issued at
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // expires in 24 hours
    iss: 'tournament-manager', // issuer
  };
  
  // In production, use proper JWT signing
  return btoa(JSON.stringify(payload)) + '.secure-signature';
};

const validateTokenStructure = (token: string): boolean => {
  try {
    // Check if token has proper structure
    if (!token || typeof token !== 'string') return false;
    
    // Check if it ends with our signature
    if (!token.endsWith('.secure-signature')) return false;
    
    // Try to decode the payload
    const payload = token.replace('.secure-signature', '');
    const decoded = JSON.parse(atob(payload));
    
    // Validate required fields
    if (!decoded.user || !decoded.iat || !decoded.exp || decoded.iss !== 'tournament-manager') {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      
      login: (userData) => {
        let user: User;
        let token: string;
        
        if (typeof userData === 'string') {
          // Handle Google OAuth credential string
          try {
            const decoded: { name: string; email: string; picture: string } = jwtDecode(userData);
            user = {
              name: decoded.name,
              email: decoded.email,
              picture: decoded.picture,
            };
            // Generate our own secure token
            token = generateSecureToken(user);
          } catch (error) {
            console.error('Invalid Google token:', error);
            return;
          }
        } else {
          // Handle local login user object
          user = userData;
          token = generateSecureToken(user);
        }
        
        set({ token, user });
      },
      
      logout: () => {
        set({ token: null, user: null });
      },
      
      isAuthenticated: () => {
        const state = get();
        return state.validateToken();
      },
      
      validateToken: () => {
        const state = get();
        
        if (!state.token) return false;
        
        // Check token structure
        if (!validateTokenStructure(state.token)) {
          // Invalid token, logout
          set({ token: null, user: null });
          return false;
        }
        
        // Check if token is expired
        if (isTokenExpired(state.token)) {
          // Token expired, logout
          set({ token: null, user: null });
          return false;
        }
        
        return true;
      },
    }),
    {
      name: 'auth-storage',
      // Only persist the token, not the user data directly
      partialize: (state) => ({ token: state.token }),
      
      // Rehydrate user data from token on app load
      onRehydrateStorage: (state) => {
        if (state?.token && validateTokenStructure(state.token) && !isTokenExpired(state.token)) {
          try {
            const payload = state.token.replace('.secure-signature', '');
            const decoded = JSON.parse(atob(payload));
            state.user = decoded.user;
          } catch (error) {
            // Invalid token, clear it
            state.token = null;
            state.user = null;
          }
        } else {
          // Invalid or expired token
          state.token = null;
          state.user = null;
        }
      },
    }
  )
);

// Hook for components to check auth status
export const useAuth = () => {
  const store = useAuthStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated(),
    login: store.login,
    logout: store.logout,
  };
};
