// Security utilities for input sanitization and validation
export class SecurityUtils {
  /**
   * Sanitize input for logging to prevent log injection
   */
  static sanitizeForLogging(input: any): string {
    if (typeof input !== 'string') {
      input = JSON.stringify(input);
    }
    
    return input
      .replace(/[\r\n]/g, '_') // Replace newlines
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .substring(0, 1000); // Limit length
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Replace & first to prevent double-encoding
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim()
      .substring(0, 10000); // Reasonable length limit
  }

  /**
   * Validate and sanitize slug input
   */
  static sanitizeSlug(slug: string): string {
    if (!slug || typeof slug !== 'string') return '';
    
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
      .substring(0, 100);
  }

  /**
   * Validate numeric input
   */
  static validateNumber(input: any, min = 0, max = Number.MAX_SAFE_INTEGER): number {
    const num = parseFloat(input);
    if (isNaN(num) || num < min || num > max) {
      throw new Error(`Invalid number: ${this.sanitizeForLogging(input)}`);
    }
    return num;
  }

  /**
   * Safe console logging that prevents injection
   */
  static safeLog(level: 'log' | 'error' | 'warn' | 'info', message: string, data?: any): void {
    const sanitizedMessage = this.sanitizeForLogging(message);
    
    if (process.env.NODE_ENV !== 'production') {
      if (data !== undefined) {
        const sanitizedData = this.sanitizeForLogging(data);
        console[level](sanitizedMessage, sanitizedData);
      } else {
        console[level](sanitizedMessage);
      }
    }
  }
}