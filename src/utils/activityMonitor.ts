// Smart activity monitoring with minimal overhead

export interface ActivityConfig {
  inactivityTimeout: number;
  monitoredEvents: string[];
  debounceMs: number;
}

export const DEFAULT_ACTIVITY_CONFIG: ActivityConfig = {
  inactivityTimeout: 2 * 60 * 60 * 1000, // 2 hours
  monitoredEvents: ['click', 'keydown', 'scroll'], // Simplified to 3 most important
  debounceMs: 30000 // Only update every 30 seconds max
};

class ActivityMonitor {
  private lastActivity: number = Date.now();
  private listeners: (() => void)[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private onActivityCallback?: () => void;
  private config: ActivityConfig;

  constructor(config: ActivityConfig = DEFAULT_ACTIVITY_CONFIG) {
    this.config = config;
  }

  // Start monitoring with better approach - passive listeners + debouncing
  start(onActivity: () => void): void {
    this.onActivityCallback = onActivity;
    this.cleanup(); // Remove any existing listeners
    
    // Add debounced event listeners
    this.config.monitoredEvents.forEach(eventType => {
      const handler = this.createDebouncedHandler();
      
      // Use passive listeners for better performance
      document.addEventListener(eventType, handler, { 
        passive: true,
        capture: false 
      });
      
      // Store cleanup function
      this.listeners.push(() => {
        document.removeEventListener(eventType, handler);
      });
    });

    console.log('🎯 Activity monitoring started (smart mode)');
  }

  // Better approach: debounced activity updates
  private createDebouncedHandler = () => {
    return () => {
      // Clear existing timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Set new timer - only call callback after debounce period
      this.debounceTimer = setTimeout(() => {
        this.lastActivity = Date.now();
        this.onActivityCallback?.();
      }, this.config.debounceMs);
    };
  };

  // Check if session should timeout due to inactivity
  isActive(): boolean {
    const now = Date.now();
    return (now - this.lastActivity) < this.config.inactivityTimeout;
  }

  // Get time remaining before inactivity timeout
  getInactivityRemaining(): number {
    const now = Date.now();
    return Math.max(0, this.config.inactivityTimeout - (now - this.lastActivity));
  }

  // Manual activity update (for programmatic activities)
  recordActivity(): void {
    this.lastActivity = Date.now();
    this.onActivityCallback?.();
  }

  // Clean shutdown
  cleanup(): void {
    this.listeners.forEach(cleanup => cleanup());
    this.listeners = [];
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  // Update last activity time (for cross-tab sync)
  updateLastActivity(timestamp: number): void {
    this.lastActivity = Math.max(this.lastActivity, timestamp);
  }

  getLastActivity(): number {
    return this.lastActivity;
  }
}

// Singleton instance for app-wide use
let activityMonitor: ActivityMonitor | null = null;

export const getActivityMonitor = (): ActivityMonitor => {
  if (!activityMonitor) {
    activityMonitor = new ActivityMonitor();
  }
  return activityMonitor;
};

export const cleanupActivityMonitor = (): void => {
  if (activityMonitor) {
    activityMonitor.cleanup();
    activityMonitor = null;
  }
};
