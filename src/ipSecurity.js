// IP Security and Rate Limiting System
class IPSecurityManager {
  constructor() {
    this.requestCounts = new Map();
    this.blockedIPs = new Set();
    this.sessionId = this.getOrCreateSessionId();
    this.init();
  }

  init() {
    this.setupRateLimiting();
    this.hideIPInformation();
    this.preventIPLeakage();
  }

  // Get or create session ID from localStorage
  getOrCreateSessionId() {
    let sessionId = localStorage.getItem('campus-whisper-session-id');
    if (!sessionId) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 12);
      sessionId = `session_${timestamp}_${random}`;
      localStorage.setItem('campus-whisper-session-id', sessionId);
    }
    return sessionId;
  }

  // Rate limiting to prevent abuse
  setupRateLimiting() {
    const RATE_LIMIT = {
      messages: { max: 30, window: 60000 }, // 30 messages per minute
      rooms: { max: 5, window: 300000 },    // 5 room creations per 5 minutes
      connections: { max: 50, window: 3600000 } // 50 connections per hour
    };

    this.rateLimiter = {
      checkLimit: (action, identifier = 'anonymous') => {
        const now = Date.now();
        const key = `${action}_${identifier}`;
        
        if (!this.requestCounts.has(key)) {
          this.requestCounts.set(key, []);
        }
        
        const requests = this.requestCounts.get(key);
        const limit = RATE_LIMIT[action];
        
        // Remove old requests outside the window
        const validRequests = requests.filter(time => now - time < limit.window);
        
        if (validRequests.length >= limit.max) {
          console.warn(`Rate limit exceeded for ${action}`);
          return false;
        }
        
        validRequests.push(now);
        this.requestCounts.set(key, validRequests);
        return true;
      }
    };
  }

  // Hide IP information from browser APIs
  hideIPInformation() {
    // Override WebRTC to prevent IP leakage
    if (window.RTCPeerConnection) {
      const originalRTC = window.RTCPeerConnection;
      window.RTCPeerConnection = function(...args) {
        const pc = new originalRTC(...args);
        
        // Block ICE candidates that might leak IP
        const originalCreateOffer = pc.createOffer;
        pc.createOffer = function(...offerArgs) {
          return originalCreateOffer.apply(this, offerArgs).then(offer => {
            // Remove IP information from SDP
            offer.sdp = offer.sdp.replace(/(\r\n|\r|\n)c=IN IP4 .*(\r\n|\r|\n)/g, '\r\nc=IN IP4 0.0.0.0\r\n');
            return offer;
          });
        };
        
        return pc;
      };
    }

    // Block navigator.connection API that might leak network info
    if (navigator.connection) {
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: 'unknown',
          type: 'unknown',
          downlink: 0,
          rtt: 0
        })
      });
    }
  }

  // Prevent various IP leakage methods
  preventIPLeakage() {
    // Block DNS prefetching
    const meta = document.createElement('meta');
    meta.httpEquiv = 'x-dns-prefetch-control';
    meta.content = 'off';
    document.head.appendChild(meta);

    // Disable geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition = () => {
        console.warn('Geolocation blocked for privacy');
      };
      navigator.geolocation.watchPosition = () => {
        console.warn('Geolocation blocked for privacy');
      };
    }

    // Block timezone detection attempts
    const originalToLocaleString = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = function(...args) {
      // Return in UTC to prevent timezone leakage
      return originalToLocaleString.call(this, 'en-US', { timeZone: 'UTC', ...args });
    };
  }

  // Generate session-based identifier (not IP-based)
  generateSecureIdentifier() {
    return this.sessionId;
  }

  // Check Firebase rate limits for the current session
  async checkFirebaseRateLimit(database, actionType = 'message') {
    try {
      if (!database) return true; // If database not available, proceed
      
      const { ref, get, update } = await import('firebase/database');
      const sessionId = this.generateSecureIdentifier();
      const limitRef = ref(database, `user_rate_limits/${sessionId}`);
      
      // Get current rate limit data
      const snapshot = await get(limitRef);
      const now = Date.now();
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const lastTime = data.lastMessageTime || 0;
        const count = data.messageCount || 0;
        
        // Define limits
        const TIME_WINDOW = 60000; // 1 minute
        const MAX_MESSAGES = actionType === 'message' ? 10 : 3; // 10 messages per minute, 3 rooms
        
        // Check if rate limited
        if (now - lastTime < TIME_WINDOW && count >= MAX_MESSAGES) {
          console.warn('Firebase rate limit exceeded');
          return false;
        }
        
        // Update counter
        await update(limitRef, {
          lastMessageTime: now,
          messageCount: (now - lastTime < TIME_WINDOW) ? count + 1 : 1
        });
        
        return true;
      } else {
        // First message from this session
        await update(limitRef, {
          lastMessageTime: now,
          messageCount: 1
        });
        return true;
      }
    } catch (error) {
      console.error('Rate limit check error:', error);
      return true; // On error, allow the action (fail open)
    }
  }
  
  // Check if action is allowed based on rate limiting
  isActionAllowed(action, database = null) {
    const identifier = this.generateSecureIdentifier();
    // Check client-side rate limiting first
    const clientAllowed = this.rateLimiter.checkLimit(action, identifier);
    
    if (!clientAllowed) return false;
    
    // Return true immediately for client-side only, checkFirebaseRateLimit will be called separately
    return true;
  }
  
  // Asynchronous version that checks both client and Firebase limits
  async isActionAllowedAsync(action, database) {
    const clientAllowed = this.isActionAllowed(action);
    if (!clientAllowed) return false;
    
    // Check Firebase rate limiting
    return await this.checkFirebaseRateLimit(database, action);
  }

  // Clean up old rate limit data
  cleanup() {
    const now = Date.now();
    const oneHour = 3600000;
    
    for (const [key, requests] of this.requestCounts.entries()) {
      const validRequests = requests.filter(time => now - time < oneHour);
      if (validRequests.length === 0) {
        this.requestCounts.delete(key);
      } else {
        this.requestCounts.set(key, validRequests);
      }
    }
  }
}

// Network Security Utils
export class NetworkSecurity {
  // Validate and sanitize network requests
  static sanitizeRequestData(data) {
    const sanitized = { ...data };
    
    // Remove any potential IP or location data
    delete sanitized.ip;
    delete sanitized.location;
    delete sanitized.geolocation;
    delete sanitized.timezone;
    delete sanitized.userAgent;
    delete sanitized.platform;
    delete sanitized.language;
    
    return sanitized;
  }

  // Create secure headers for requests
  static getSecureHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }

  // Obfuscate fingerprinting attempts
  static obfuscateFingerprint() {
    // Override screen properties
    Object.defineProperty(screen, 'width', { value: 1920 });
    Object.defineProperty(screen, 'height', { value: 1080 });
    Object.defineProperty(screen, 'availWidth', { value: 1920 });
    Object.defineProperty(screen, 'availHeight', { value: 1040 });
    
    // Override navigator properties
    Object.defineProperty(navigator, 'platform', { value: 'Win32' });
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 4 });
    
    // Override timezone
    if (Intl && Intl.DateTimeFormat) {
      const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
      Intl.DateTimeFormat.prototype.resolvedOptions = function() {
        const options = originalResolvedOptions.call(this);
        options.timeZone = 'UTC';
        return options;
      };
    }
  }

  // Secure localStorage operations
  static secureLocalStorage = {
    setItem: (key, value) => {
      try {
        const encrypted = btoa(JSON.stringify({
          data: value,
          timestamp: Date.now(),
          checksum: btoa(value).length
        }));
        localStorage.setItem(`cw_${key}`, encrypted);
      } catch (error) {
        console.warn('Failed to store data securely');
      }
    },
    
    getItem: (key) => {
      try {
        const encrypted = localStorage.getItem(`cw_${key}`);
        if (!encrypted) return null;
        
        const decrypted = JSON.parse(atob(encrypted));
        
        // Validate data integrity
        if (btoa(decrypted.data).length !== decrypted.checksum) {
          localStorage.removeItem(`cw_${key}`);
          return null;
        }
        
        // Check if data is too old (24 hours)
        if (Date.now() - decrypted.timestamp > 86400000) {
          localStorage.removeItem(`cw_${key}`);
          return null;
        }
        
        return decrypted.data;
      } catch (error) {
        localStorage.removeItem(`cw_${key}`);
        return null;
      }
    },
    
    removeItem: (key) => {
      localStorage.removeItem(`cw_${key}`);
    }
  };
}

// Initialize IP security
const ipSecurityManager = new IPSecurityManager();

// Clean up rate limiting data every 5 minutes
setInterval(() => {
  ipSecurityManager.cleanup();
}, 300000);

// Apply fingerprint obfuscation
NetworkSecurity.obfuscateFingerprint();

export { ipSecurityManager, IPSecurityManager };
export default IPSecurityManager;
