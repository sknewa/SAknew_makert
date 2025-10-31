// utils/securityUtils.ts
import { safeLog as secureLog, safeError as secureError, safeWarn as secureWarn } from './secureLogger';

export class SecurityUtils {
  static sanitizeInput(input: string): string {
    return input.replace(/[<>\"'&]/g, '');
  }
}

// Re-export from secureLogger for backward compatibility
export const safeLog = secureLog;
export const safeError = secureError;
export const safeWarn = secureWarn;
