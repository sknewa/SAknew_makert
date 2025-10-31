// utils/secureLogger.ts
/**
 * Secure logging utility to prevent log injection attacks
 * Sanitizes user input before logging to prevent CWE-117 vulnerabilities
 */

/**
 * Sanitizes input by removing or encoding potentially dangerous characters
 * that could be used for log injection attacks
 */
export const sanitizeForLog = (input: any): string => {
  if (input === null || input === undefined) {
    return 'null';
  }
  
  const str = String(input);
  
  // Remove or encode newline characters and other control characters
  return str
    .replace(/\r\n/g, '\\r\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove other control characters
};

/**
 * Secure console.log wrapper
 */
export const secureLog = (...args: any[]) => {
  const sanitizedArgs = args.map(arg => 
    typeof arg === 'string' ? sanitizeForLog(arg) : arg
  );
  console.log(...sanitizedArgs);
};

/**
 * Secure console.error wrapper
 */
export const secureError = (...args: any[]) => {
  const sanitizedArgs = args.map(arg => 
    typeof arg === 'string' ? sanitizeForLog(arg) : arg
  );
  console.error(...sanitizedArgs);
};

/**
 * Secure console.warn wrapper
 */
export const secureWarn = (...args: any[]) => {
  const sanitizedArgs = args.map(arg => 
    typeof arg === 'string' ? sanitizeForLog(arg) : arg
  );
  console.warn(...sanitizedArgs);
};

// Export as safeLog, safeError, safeWarn for backward compatibility
export const safeLog = secureLog;
export const safeError = secureError;
export const safeWarn = secureWarn;

export default {
  log: secureLog,
  error: secureError,
  warn: secureWarn,
  sanitize: sanitizeForLog
};