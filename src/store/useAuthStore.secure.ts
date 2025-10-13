import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import { useEffect } from 'react';

interface User {
  name: string;
  email?: string;
  picture?: string;
}

interface AuthState {
  sessionId: string | null;
  user: User | null;
  lastActivity: number;
  login: (userData: User | string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  refreshSession: () => void;
}

// Security configuration
const SECURITY_CONFIG = {
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  ACTIVITY_TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours of inactivity
  APP_SECRET: 'tournament-manager-2025', // In production, this would be from env
  MIN_SESSION_LENGTH: 32,
};

// Security utilities
const generateSecureSessionId = (user: User): string => {
  const timestamp = Date.now();
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const userHash = btoa(user.email || user.name).slice(0, 8);
  const randomString = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  
  return `${timestamp}.${userHash}.${randomString}.${btoa(SECURITY_CONFIG.APP_SECRET).slice(0, 8)}`;
};

const validateSessionId = (sessionId: string): boolean => {
  if (!sessionId || typeof sessionId !== 'string') return false;
  
  const parts = sessionId.split('.');
  if (parts.length !== 4) return false;
  
  const [timestamp, userHash, randomString, appSignature] = parts;
  
  // Validate timestamp format
  const sessionTime = parseInt(timestamp);
  if (isNaN(sessionTime)) return false;
  
  // Check if session is too old
  const now = Date.now();
  if (now - sessionTime > SECURITY_CONFIG.SESSION_TIMEOUT) return false;
  
  // Validate app signature
  const expectedSignature = btoa(SECURITY_CONFIG.APP_SECRET).slice(0, 8);
  if (appSignature !== expectedSignature) return false;
  
  // Validate minimum length
  if (sessionId.length < SECURITY_CONFIG.MIN_SESSION_LENGTH) return false;
  
  return true;
};

const isSessionActive = (lastActivity: number): boolean => {
  const now = Date.now();
  return (now - lastActivity) < SECURITY_CONFIG.ACTIVITY_TIMEOUT;
};

// Additional security: Browser fingerprinting
const getBrowserFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Security fingerprint', 2, 2);
  }
  
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas: canvas.toDataURL(),
  };
  
  return btoa(JSON.stringify(fingerprint)).slice(0, 16);
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      user: null,
      lastActivity: Date.now(),
      
      login: (userData) => {
        let user: User;
        
        if (typeof userData === 'string') {
          // Handle Google OAuth credential string
          try {
            const decoded: { name: string; email: string; picture: string } = jwtDecode(userData);
            user = {
              name: decoded.name,
              email: decoded.email,
              picture: decoded.picture,
            };
          } catch (error) {
            console.error('Invalid Google token:', error);
            return;
          }
        } else {
          // Handle local login user object
          user = userData;
        }
        
        const sessionId = generateSecureSessionId(user);
        const lastActivity = Date.now();
        
        set({ sessionId, user, lastActivity });
        
        // Store browser fingerprint for additional security
        localStorage.setItem('browser-fp', getBrowserFingerprint());
      },
      
      logout: () => {
        set({ sessionId: null, user: null, lastActivity: 0 });
        localStorage.removeItem('browser-fp');
      },
      
      refreshSession: () => {
        const state = get();
        if (state.sessionId && state.user) {
          set({ lastActivity: Date.now() });
        }
      },
      
      isAuthenticated: () => {
        const state = get();
        
        // Check if we have a session
        if (!state.sessionId || !state.user) return false;
        
        // Validate session structure and expiry
        if (!validateSessionId(state.sessionId)) {
          // Invalid session, logout
          set({ sessionId: null, user: null, lastActivity: 0 });
          return false;
        }
        
        // Check activity timeout
        if (!isSessionActive(state.lastActivity)) {
          // Session timed out, logout
          set({ sessionId: null, user: null, lastActivity: 0 });
          return false;
        }
        
        // Check browser fingerprint (additional security layer)
        const storedFingerprint = localStorage.getItem('browser-fp');
        const currentFingerprint = getBrowserFingerprint();
        if (storedFingerprint !== currentFingerprint) {
          // Browser fingerprint changed, potential security risk
          console.warn('Browser fingerprint mismatch - logging out for security');
          set({ sessionId: null, user: null, lastActivity: 0 });
          localStorage.removeItem('browser-fp');
          return false;
        }
        
        // Update last activity
        set({ lastActivity: Date.now() });
        
        return true;
      },
    }),
    {
      name: 'auth-session',
      // Only persist sessionId and lastActivity
      partialize: (state) => ({ 
        sessionId: state.sessionId, 
        lastActivity: state.lastActivity,
        user: state.user // We'll validate this on rehydration
      }),
    }
  )
);

// Enhanced hook for components
export const useAuth = () => {
  const store = useAuthStore();
  
  // Auto-refresh session on component mount/usage
  const refreshSession = store.refreshSession;
  
  // Call refresh when hook is used (keeps session active)
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);
  
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated(),
    login: store.login,
    logout: store.logout,
    refreshSession: store.refreshSession,
  };
};
