// utils/secureLogger.ts
/**
 * Secure logging utility to prevent log injection attacks.
 * Sanitizes user input before logging to reduce the risk of log injection.
 */

/**
 * Sanitizes input by removing or encoding potentially dangerous characters
 * that could be used for log injection attacks.
 */
export const sanitizeForLog = (input: any): string => {
  if (input === null || input === undefined) {
    return 'null';
  }

  if (typeof input === 'object') {
    try {
      input = JSON.stringify(input);
    } catch {
      input = String(input);
    }
  }

  const str = String(input);

  return str
    .replace(/\r\n/g, '\\r\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/[\x00-\x1F\x7F]/g, '');
};

const normalizeArgs = (...args: any[]) => {
  return args.map(arg => sanitizeForLog(arg));
};

const canConsole = typeof console !== 'undefined';

export const secureLog = (...args: any[]) => {
  if (!canConsole) return;
  console.log(...normalizeArgs(...args));
};

export const secureError = (...args: any[]) => {
  if (!canConsole) return;
  console.error(...normalizeArgs(...args));
};

export const secureWarn = (...args: any[]) => {
  if (!canConsole) return;
  console.warn(...normalizeArgs(...args));
};

export const safeLog = secureLog;
export const safeError = secureError;
export const safeWarn = secureWarn;

export default {
  log: secureLog,
  error: secureError,
  warn: secureWarn,
  sanitize: sanitizeForLog,
};