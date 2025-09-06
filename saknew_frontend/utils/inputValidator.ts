// utils/inputValidator.ts
export class InputValidator {
  static sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove potentially dangerous characters
    return input
      .replace(/[<>\"'&]/g, '') // Remove HTML/script injection chars
      .replace(/[\r\n\t]/g, ' ') // Replace newlines with spaces
      .trim()
      .substring(0, 1000); // Limit length
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  static validateId(id: any): number | null {
    const numId = parseInt(id);
    return !isNaN(numId) && numId > 0 ? numId : null;
  }

  static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') return '';
    
    return query
      .replace(/[^\w\s-]/g, '') // Only allow word chars, spaces, hyphens
      .trim()
      .substring(0, 100);
  }
}