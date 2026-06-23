import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

export const config = {
  nodeEnv: getOptionalEnv('NODE_ENV', 'production'),
  port: parseInt(getOptionalEnv('PORT', '3000')),

  database: {
    url: getEnv('DATABASE_URL', 'postgres://pier:pier@localhost:5432/pier'),
  },

  session: {
    secret: getEnv('SESSION_SECRET', 'dev-secret'),
  },

  smtp: {
    host: getOptionalEnv('SMTP_HOST'),
    port: parseInt(getOptionalEnv('SMTP_PORT', '465')),
    user: getOptionalEnv('SMTP_USER'),
    pass: getOptionalEnv('SMTP_PASS'),
    from: getOptionalEnv('SMTP_FROM', 'noreply@ailaopo.online'),
  },

  admin: {
    email: getOptionalEnv('ADMIN_EMAIL'),
    builtinEmail: getOptionalEnv('ADMIN_EMAIL_BUILTIN'),
    contactEmail: getOptionalEnv('CONTACT_EMAIL'),
  },

  devApiKey: getOptionalEnv('DEV_API_KEY'),

  appEnv: getOptionalEnv('APP_ENV', 'prod'),

  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.APP_ENV === 'test',
} as const;

export function validateConfig(): void {
  const required = ['SESSION_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`Warning: Missing optional environment variables: ${missing.join(', ')}`);
  }

  if (!config.database.url) {
    throw new Error('DATABASE_URL is required');
  }
}

export default config;
