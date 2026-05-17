import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;
let transporterPromise: Promise<void> | null = null;

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

function initTransporter(): void {
  const cfg = getSmtpConfig();
  if (!cfg) {
    console.warn('SMTP not configured, using dev mode (console.log)');
    return;
  }
  transporterPromise = new Promise<void>((resolve) => {
    const t = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    t.verify().then(() => {
      transporter = t;
      console.log(`SMTP ready: ${cfg.host}:${cfg.port}`);
    }).catch((err: any) => {
      console.warn('SMTP verify failed, using dev mode:', err.message);
      transporter = null;
    }).finally(() => resolve());
  });
}

export async function sendVerificationCode(
  email: string,
  code: string
): Promise<void> {
  if (transporterPromise) await transporterPromise;

  if (!transporter) {
    console.log(`[DEV MAIL] To: ${email} | Code: ${code}`);
    return;
  }

  const cfg = getSmtpConfig()!;
  try {
    await transporter.sendMail({
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
    });
    console.log(`Email sent to ${email}`);
  } catch (err: any) {
    console.error(`SMTP send failed for ${email}:`, err.message);
    console.log(`[FALLBACK MAIL] To: ${email} | Code: ${code}`);
  }
}

initTransporter();
