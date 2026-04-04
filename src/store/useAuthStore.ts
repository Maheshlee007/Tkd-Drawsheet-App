import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import { generateFingerprint, validateFingerprint } from '@/utils/fingerprint';
import { generateSessionId, validateSession } from '@/utils/sessionManager';
import { getActivityMonitor, cleanupActivityMonitor } from '@/utils/activityMonitor';
import { getTabSynchronizer } from '@/utils/tabSync';
import { apiRequest, setStoredTokens, clearStoredTokens } from '@/services/api';

interface User {
  name: string;
  email?: string;
  picture?: string;
  roles?: string[];
  permissions?: string[];
}

interface AuthState {
  sessionId: string | null;
  user: User | null;
  lastActivity: number;
  loginTime: number;
  browserFingerprint: string | null;
  login: (userData: User | string) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
  refreshActivity: () => void;
  getSessionInfo: () => SessionInfo;
}

interface SessionInfo {
  loginTime: number;
  lastActivity: number;
  timeRemaining: number;
  inactivityRemaining: number;
  isActive: boolean;
}

const STORAGE_KEY = 'tournament-auth';
const FINGERPRINT_KEY = 'tournament-fp';
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      user: null,
      lastActivity: Date.now(),
      loginTime: 0,
      browserFingerprint: null,
      
      login: async (userData) => {
        try {
          let user: User;
          
          // Parse user data
          if (typeof userData === 'string') {
            const decoded: { name: string; email: string; picture: string } = jwtDecode(userData);
            console.log('Decoded user data:', decoded);
            
            user = {
              name: decoded.name,
              email: decoded.email,
              picture: decoded.picture,
            };
          } else {
            user = userData;
          }
          
          // Generate security components
          const sessionId = generateSessionId(user);
          const browserFingerprint = await generateFingerprint();
          const now = Date.now();
          
          // Store fingerprint separately for extra security
          localStorage.setItem(FINGERPRINT_KEY, browserFingerprint);
          
          // Update state
          set({ 
            sessionId, 
            user, 
            lastActivity: now,
            loginTime: now,
            browserFingerprint 
          });
          
          // Setup activity monitoring
          const activityMonitor = getActivityMonitor();
          activityMonitor.start(() => {
            get().refreshActivity();
          });
          
          // Setup cross-tab synchronization
          const tabSync = getTabSynchronizer();
          tabSync.broadcastLogin(sessionId);
          
          console.log('🔐 Secure login successful');
        } catch (error) {
          console.error('Login failed:', error);
        }
      },

      loginWithCredentials: async (email: string, password: string) => {
        const res = await apiRequest<{ data: { accessToken: string; refreshToken: string; user: { email: string; firstName: string; lastName: string; roles: string[]; permissions: string[] } } }>('/api/auth/login', {
          method: 'POST',
          body: { email, password },
          skipAuth: true,
        });
        const { accessToken, refreshToken, user: apiUser } = res.data;
        setStoredTokens(accessToken, refreshToken);
        const user: User = {
          name: `${apiUser.firstName} ${apiUser.lastName}`,
          email: apiUser.email,
          roles: apiUser.roles,
          permissions: apiUser.permissions,
        };
        await get().login(user);
      },

      loginWithGoogle: async (googleToken: string) => {
        const res = await apiRequest<{ data: { accessToken: string; refreshToken: string; user: { email: string; firstName: string; lastName: string; roles: string[]; permissions: string[] } } }>('/api/auth/google', {
          method: 'POST',
          body: { idToken: googleToken },
          skipAuth: true,
        });
        const { accessToken, refreshToken, user: apiUser } = res.data;
        setStoredTokens(accessToken, refreshToken);
        const user: User = {
          name: `${apiUser.firstName} ${apiUser.lastName}`,
          email: apiUser.email,
          roles: apiUser.roles,
          permissions: apiUser.permissions,
        };
        await get().login(user);
      },
      
      logout: () => {
        // Cleanup activity monitoring
        cleanupActivityMonitor();
        
        // Clear fingerprint and tokens
        localStorage.removeItem(FINGERPRINT_KEY);
        clearStoredTokens();
        
        // Broadcast logout to other tabs
        const tabSync = getTabSynchronizer();
        tabSync.broadcastLogout();
        
        // Clear state
        set({ 
          sessionId: null, 
          user: null, 
          lastActivity: 0,
          loginTime: 0,
          browserFingerprint: null 
        });
        
        console.log('🚪 Secure logout completed');
      },
      
      refreshActivity: () => {
        const state = get();
        if (state.sessionId && state.isAuthenticated()) {
          const now = Date.now();
          set({ lastActivity: now });
          
          // Broadcast activity to other tabs
          const tabSync = getTabSynchronizer();
          tabSync.broadcastActivity();
        }
      },
      
      isAuthenticated: () => {
        const state = get();
        
        if (!state.sessionId || !state.user) return false;
        
        // 1. Validate session structure and signature
        if (!validateSession(state.sessionId)) {
          console.warn('🚨 Invalid session detected');
          state.logout();
          return false;
        }
        
        // 2. Check activity timeout
        const activityMonitor = getActivityMonitor();
        if (!activityMonitor.isActive()) {
          console.warn('😴 Session timed out due to inactivity');
          state.logout();
          return false;
        }
        
        // 3. Validate browser fingerprint (async check)
        validateFingerprint(state.browserFingerprint || '').then(isValid => {
          if (!isValid) {
            console.warn('🔍 Browser fingerprint mismatch');
            state.logout();
          }
        });
        
        return true;
      },
      
      getSessionInfo: () => {
        const state = get();
        const activityMonitor = getActivityMonitor();
        
        return {
          loginTime: state.loginTime,
          lastActivity: state.lastActivity,
          timeRemaining: state.sessionId ? 
            Math.max(0, SESSION_DURATION - (Date.now() - state.loginTime)) : 0,
          inactivityRemaining: activityMonitor.getInactivityRemaining(),
          isActive: activityMonitor.isActive()
        };
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        sessionId: state.sessionId,
        user: state.user,
        lastActivity: state.lastActivity,
        loginTime: state.loginTime,
        browserFingerprint: state.browserFingerprint
      }),
      
      onRehydrateStorage: () => (state) => {
        if (state?.sessionId) {
          // Setup activity monitoring on app load
          const activityMonitor = getActivityMonitor();
          activityMonitor.updateLastActivity(state.lastActivity);
          activityMonitor.start(() => {
            state.refreshActivity();
          });
          
          // Setup cross-tab sync
          const tabSync = getTabSynchronizer();
          tabSync.setupSessionSync(
            (sessionId) => {
              // Another tab logged in
              if (sessionId !== state.sessionId) {
                window.location.reload();
              }
            },
            () => {
              // Another tab logged out
              state.logout();
            },
            () => {
              // Activity in another tab
              state.refreshActivity();
            }
          );
        }
      },
    }
  )
);

// Enhanced hook for components
export const useAuth = () => {
  const store = useAuthStore();
  
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated(),
    login: store.login,
    loginWithCredentials: store.loginWithCredentials,
    loginWithGoogle: store.loginWithGoogle,
    logout: store.logout,
    refreshActivity: store.refreshActivity,
    sessionInfo: store.getSessionInfo(),
  };
};
