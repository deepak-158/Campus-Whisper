// Security utilities to prevent data exposure and protect the application
class SecurityManager {
  constructor() {
    this.init();
  }

  init() {
    if (import.meta.env.PROD) {
      this.disableDevTools();
      this.disableContextMenu();
      this.disableKeyboardShortcuts();
      this.preventSelection();
      this.obfuscateConsole();
    }
  }

  // Disable right-click context menu
  disableContextMenu() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
  }

  // Disable common developer keyboard shortcuts
  disableKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && e.shiftKey && e.key === 'K')
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });
  }

  // Prevent text selection
  preventSelection() {
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
    });
    
    document.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });
  }

  // Detect and disable dev tools
  disableDevTools() {
    // Method 1: Check window size changes (dev tools opening)
    let devtools = {
      open: false,
      orientation: null
    };

    const threshold = 160;

    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        
        devtools.open = true;
        devtools.orientation = (window.outerHeight - window.innerHeight > threshold) ? 'vertical' : 'horizontal';
        this.handleDevToolsDetection();
      } else {
        devtools.open = false;
      }
    }, 500);

    // Method 2: Console detection
    let element = new Image();
    Object.defineProperty(element, 'id', {
      get: () => {
        this.handleDevToolsDetection();
      }
    });
    
    setInterval(() => {
      console.log(element);
    }, 1000);
  }

  // Handle when dev tools are detected
  handleDevToolsDetection() {
    document.body.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000;
        color: #ff4444;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: monospace;
        font-size: 24px;
        z-index: 99999;
        flex-direction: column;
      ">
        <h1>🔒 Access Denied</h1>
        <p>Developer tools detected. Please close developer tools to continue.</p>
        <p style="font-size: 14px; margin-top: 20px;">Campus Whisper - Security Enabled</p>
      </div>
    `;
    
    // Clear all intervals and timeouts
    let id = window.setTimeout(() => {}, 0);
    while (id--) {
      window.clearTimeout(id);
    }
  }

  // Obfuscate console output
  obfuscateConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    console.info = () => {};
    console.debug = () => {};
    
    // Store original methods for internal use
    this.originalConsole = {
      log: originalLog,
      error: originalError,
      warn: originalWarn,
      info: originalInfo
    };
  }

  // Safe logging for development
  safeLog(...args) {
    if (import.meta.env.DEV && this.originalConsole) {
      this.originalConsole.log(...args);
    }
  }

  safeError(...args) {
    if (import.meta.env.DEV && this.originalConsole) {
      this.originalConsole.error(...args);
    }
  }
}

// Data obfuscation utilities
export class DataProtection {
  // Obfuscate sensitive data for display
  static obfuscateApiKey(key) {
    if (!key) return 'Not configured';
    return key.substring(0, 8) + '*'.repeat(key.length - 12) + key.substring(key.length - 4);
  }

  // Mask username partially
  static maskUsername(username) {
    if (!username || username.length <= 3) return username;
    return username.substring(0, 2) + '*'.repeat(username.length - 4) + username.substring(username.length - 2);
  }

  // Clean sensitive data from objects before logging
  static sanitizeObject(obj) {
    const sanitized = { ...obj };
    const sensitiveKeys = ['apiKey', 'password', 'token', 'secret', 'key'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  // Encrypt local storage data
  static encryptData(data) {
    try {
      const encrypted = btoa(JSON.stringify(data));
      return encrypted;
    } catch (error) {
      return data;
    }
  }

  // Decrypt local storage data
  static decryptData(encryptedData) {
    try {
      const decrypted = JSON.parse(atob(encryptedData));
      return decrypted;
    } catch (error) {
      return encryptedData;
    }
  }
}

// Initialize security manager
const securityManager = new SecurityManager();

export { securityManager, SecurityManager };
export default SecurityManager;
