// Session management utilities

export interface SessionData {
  sessionId: string;
  timestamp: number;
  userHash: string;
  signature: string;
}

export const SESSION_CONFIG = {
  DURATION: 12 * 60 * 60 * 1000, // 12 hours
  SIGNATURE_SECRET: 'tournament-manager-2025',
};

// Generate secure session ID
export const generateSessionId = (user: { name: string; email?: string }): string => {
  const timestamp = Date.now();
  const userHash = btoa(user.email || user.name).substring(0, 8);
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const randomString = Array.from(randomBytes, byte => 
    byte.toString(16).padStart(2, '0')
  ).join('');
  
  // Create tamper-proof signature
  const signatureData = `${timestamp}-${userHash}-${randomString}-${SESSION_CONFIG.SIGNATURE_SECRET}`;
  const signature = btoa(signatureData).substring(0, 16);
  
  return `${timestamp}.${userHash}.${randomString}.${signature}`;
};

// Parse and validate session ID structure
export const parseSessionId = (sessionId: string): SessionData | null => {
  try {
    const parts = sessionId.split('.');
    if (parts.length !== 4) return null;
    
    const [timestampStr, userHash, randomString, signature] = parts;
    const timestamp = parseInt(timestampStr);
    
    if (isNaN(timestamp)) return null;
    
    return {
      sessionId,
      timestamp,
      userHash,
      signature
    };
  } catch {
    return null;
  }
};

// Validate session signature (tamper detection)
export const validateSessionSignature = (sessionData: SessionData): boolean => {
  try {
    const { timestamp, userHash, signature } = sessionData;
    const parts = sessionData.sessionId.split('.');
    const randomString = parts[2];
    
    // Recreate expected signature
    const signatureData = `${timestamp}-${userHash}-${randomString}-${SESSION_CONFIG.SIGNATURE_SECRET}`;
    const expectedSignature = btoa(signatureData).substring(0, 16);
    
    return signature === expectedSignature;
  } catch {
    return false;
  }
};

// Check if session has expired
export const isSessionExpired = (sessionData: SessionData): boolean => {
  const now = Date.now();
  return (now - sessionData.timestamp) > SESSION_CONFIG.DURATION;
};

// Validate complete session
export const validateSession = (sessionId: string): boolean => {
  if (!sessionId) return false;
  
  const sessionData = parseSessionId(sessionId);
  if (!sessionData) return false;
  
  if (!validateSessionSignature(sessionData)) return false;
  
  if (isSessionExpired(sessionData)) return false;
  
  return true;
};
