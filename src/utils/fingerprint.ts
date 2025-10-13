// Simple but effective browser fingerprinting
// Using only 3 most unique identifiers as suggested

export interface BrowserFingerprint {
  canvas: string;
  webgl: string;
  system: string;
}

export const generateFingerprint = async (): Promise<string> => {
  try {
    // 1. Canvas fingerprinting (most unique)
    const canvas = await getCanvasFingerprint();
    
    // 2. WebGL renderer (hardware specific)
    const webgl = getWebGLFingerprint();
    
    // 3. System info (combined unique data)
    const system = getSystemFingerprint();
    
    // Combine and hash
    const combined = `${canvas}|${webgl}|${system}`;
    return await hashString(combined);
  } catch (error) {
    console.warn('Fingerprint generation failed, using fallback');
    return await hashString(`fallback-${Date.now()}-${Math.random()}`);
  }
};

// Canvas fingerprinting - most reliable unique identifier
const getCanvasFingerprint = async (): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return 'no-canvas';
  
  canvas.width = 200;
  canvas.height = 50;
  
  // Create unique rendering pattern
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText('TournamentManager🏆', 2, 15);
  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
  ctx.fillText('Security-2025', 4, 35);
  
  return canvas.toDataURL();
};

// WebGL fingerprinting - hardware specific
const getWebGLFingerprint = (): string => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext;
    
    if (!gl) return 'no-webgl';
    
    const renderer = gl.getParameter(gl.RENDERER) || 'unknown-renderer';
    const vendor = gl.getParameter(gl.VENDOR) || 'unknown-vendor';
    
    return `${vendor}-${renderer}`.substring(0, 50);
  } catch {
    return 'webgl-error';
  }
};

// System fingerprint - combined unique data
const getSystemFingerprint = (): string => {
  const system = {
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    cores: navigator.hardwareConcurrency || 0,
    touch: navigator.maxTouchPoints || 0
  };
  
  return Object.values(system).join('-');
};

// Secure hashing utility
const hashString = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
};

// Validation
export const validateFingerprint = async (stored: string): Promise<boolean> => {
  try {
    const current = await generateFingerprint();
    return stored === current;
  } catch {
    return false;
  }
};
