import { isValidEmail, isValidUuid, isValidCode, sanitizeString } from '../utils/validation';

describe('Validation Utils', () => {
  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
    });
  });

  describe('isValidUuid', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUuid('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUuid('invalid-uuid')).toBe(false);
      expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
    });
  });

  describe('isValidCode', () => {
    it('should validate 6-digit codes', () => {
      expect(isValidCode('123456')).toBe(true);
      expect(isValidCode('000000')).toBe(true);
    });

    it('should reject invalid codes', () => {
      expect(isValidCode('12345')).toBe(false);
      expect(isValidCode('1234567')).toBe(false);
      expect(isValidCode('abcdef')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should limit length', () => {
      const long = 'a'.repeat(1000);
      expect(sanitizeString(long, 10)).toHaveLength(10);
    });

    it('should use default max length', () => {
      const long = 'a'.repeat(600);
      expect(sanitizeString(long)).toHaveLength(500);
    });
  });
});
