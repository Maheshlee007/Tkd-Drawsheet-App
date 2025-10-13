// Cross-tab synchronization utilities

export const SYNC_EVENTS = {
  SESSION_UPDATE: 'tournament-session-update',
  LOGOUT_ALL: 'tournament-logout-all',
  ACTIVITY_UPDATE: 'tournament-activity-update'
};

export interface SyncMessage {
  type: 'login' | 'logout' | 'activity';
  timestamp: number;
  sessionId?: string;
}

class TabSynchronizer {
  private listeners: Map<string, (data: any) => void> = new Map();

  // Broadcast message to all tabs
  broadcast(eventType: string, data: any): void {
    try {
      localStorage.setItem(eventType, JSON.stringify({
        ...data,
        timestamp: Date.now(),
        tabId: this.getTabId()
      }));
      
      // Remove after short delay to avoid clutter
      setTimeout(() => {
        localStorage.removeItem(eventType);
      }, 1000);
    } catch (error) {
      console.warn('Failed to broadcast sync event:', error);
    }
  }

  // Listen for events from other tabs
  listen(eventType: string, callback: (data: any) => void): () => void {
    this.listeners.set(eventType, callback);
    
    const handler = (e: StorageEvent) => {
      if (e.key === eventType && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          // Don't respond to our own broadcasts
          if (data.tabId !== this.getTabId()) {
            callback(data);
          }
        } catch {
          // Invalid data, ignore
        }
      }
    };
    
    window.addEventListener('storage', handler);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handler);
      this.listeners.delete(eventType);
    };
  }

  // Broadcast login to other tabs
  broadcastLogin(sessionId: string): void {
    this.broadcast(SYNC_EVENTS.SESSION_UPDATE, {
      type: 'login',
      sessionId
    });
  }

  // Broadcast logout to other tabs
  broadcastLogout(): void {
    this.broadcast(SYNC_EVENTS.LOGOUT_ALL, {
      type: 'logout'
    });
  }

  // Broadcast activity to other tabs
  broadcastActivity(): void {
    this.broadcast(SYNC_EVENTS.ACTIVITY_UPDATE, {
      type: 'activity'
    });
  }

  // Get unique tab identifier
  private getTabId(): string {
    if (!window.tabId) {
      window.tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return window.tabId;
  }

  // Setup cross-tab session sync
  setupSessionSync(
    onLogin: (sessionId: string) => void,
    onLogout: () => void,
    onActivity: () => void
  ): () => void {
    const cleanupFunctions: (() => void)[] = [];
    
    // Listen for session updates
    cleanupFunctions.push(
      this.listen(SYNC_EVENTS.SESSION_UPDATE, (data) => {
        if (data.type === 'login' && data.sessionId) {
          onLogin(data.sessionId);
        }
      })
    );
    
    // Listen for logout events
    cleanupFunctions.push(
      this.listen(SYNC_EVENTS.LOGOUT_ALL, (data) => {
        if (data.type === 'logout') {
          onLogout();
        }
      })
    );
    
    // Listen for activity updates
    cleanupFunctions.push(
      this.listen(SYNC_EVENTS.ACTIVITY_UPDATE, (data) => {
        if (data.type === 'activity') {
          onActivity();
        }
      })
    );
    
    // Return cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }
}

// Extend window type for tabId
declare global {
  interface Window {
    tabId?: string;
  }
}

// Singleton instance
let tabSync: TabSynchronizer | null = null;

export const getTabSynchronizer = (): TabSynchronizer => {
  if (!tabSync) {
    tabSync = new TabSynchronizer();
  }
  return tabSync;
};
