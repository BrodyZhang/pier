import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;
let transporterReady = false;

function getSmtpConfig(): {
  host: string; port: number; user: string; pass: string; from: string;
} | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || 'noreply@ailaopo.online';
  if (!host || !user || !pass) return null;
  return { host, port, user, pass, from };
}

function isResend(): boolean {
  return (process.env.SMTP_HOST || '').includes('resend.com');
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)),
  ]);
}

async function sendViaResendApi(from: string, to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.SMTP_PASS;
  if (!apiKey) throw new Error('SMTP_PASS (Resend API key) not set');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API ${res.status}: ${text}`);
  }
}

async function initTransporter(): Promise<void> {
  const cfg = getSmtpConfig();
  if (!cfg) {
    console.warn('SMTP not configured, using dev mode (console.log)');
    transporterReady = true;
    return;
  }

  // Resend: use HTTPS API (port 443) instead of SMTP (port 465 may be blocked on Azure)
  if (isResend()) {
    console.log('Resend detected, using HTTPS API');
    transporterReady = true;
    return;
  }

  // Other SMTP: use nodemailer
  try {
    const t = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await withTimeout(t.verify(), 8000);
    transporter = t;
    console.log(`SMTP ready: ${cfg.host}:${cfg.port}`);
  } catch (err: any) {
    console.warn('SMTP verify failed, using dev mode:', err.message);
    transporter = null;
  } finally {
    transporterReady = true;
  }
}

const initPromise = initTransporter();

export async function sendVerificationCode(
  email: string,
  code: string
): Promise<void> {
  await initPromise;

  console.log(`[MAIL] To: ${email} | Code: ${code}`);

  const cfg = getSmtpConfig();
  if (!cfg) return;

  try {
    if (isResend()) {
      await withTimeout(sendViaResendApi(cfg.from, email, '验证码 | ailaopo.online',
        `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:30px;">
          <h2 style="color:#e74c3c;">验证码</h2>
          <p style="font-size:24px;letter-spacing:6px;background:#f5f5f5;padding:15px;text-align:center;border-radius:8px;">
            <b>${code}</b>
          </p>
          <p style="color:#999;font-size:13px;">有效期 10 分钟。如果不是本人操作请忽略。</p>
        </div>`
      ), 10000);
    } else if (transporter) {
      await withTimeout(transporter.sendMail({
        from: cfg.from,
        to: email,
        subject: '验证码 | ailaopo.online',
        html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:30px;">
          <h2 style="color:#e74c3c;">验证码</h2>
          <p style="font-size:24px;letter-spacing:6px;background:#f5f5f5;padding:15px;text-align:center;border-radius:8px;">
            <b>${code}</b>
          </p>
          <p style="color:#999;font-size:13px;">有效期 10 分钟。如果不是本人操作请忽略。</p>
        </div>`,
      }), 10000);
    } else {
      return;
    }
    console.log(`Email sent to ${email}`);
  } catch (err: any) {
    console.error(`Email delivery failed for ${email}:`, err.message);
  }
}
