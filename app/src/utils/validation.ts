export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUuid(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

export function isValidCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function sanitizeString(str: string, maxLength: number = 500): string {
  return str.trim().substring(0, maxLength);
}
