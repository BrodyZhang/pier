import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

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

async function initTransporter(): Promise<void> {
  const cfg = getSmtpConfig();
  if (!cfg) {
    console.warn('Warning: SMTP not configured, using dev mode (console.log)');
    return;
  }
  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  try {
    await transporter.verify();
    console.log(`SMTP connected: ${cfg.host}:${cfg.port}`);
  } catch {
    console.warn('Warning: SMTP verification failed, falling back to dev mode');
    transporter = null;
  }
}

export async function sendVerificationCode(
  email: string,
  code: string
): Promise<void> {
  if (!transporter) {
    console.log(`[DEV MAIL] To: ${email} | Code: ${code}`);
    return;
  }
  const cfg = getSmtpConfig()!;
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
}

initTransporter();
