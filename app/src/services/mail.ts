const isDev = process.env.NODE_ENV !== 'production';

let sgMail: any = null;

async function initSendGrid(): Promise<void> {
  if (isDev) return;
  const key = process.env.SENDGRID_API_KEY;
  if (!key) {
    console.warn('Warning: SENDGRID_API_KEY not set, using dev mode');
    return;
  }
  try {
    const mod = await import('@sendgrid/mail');
    sgMail = mod.default;
    sgMail.setApiKey(key);
  } catch {
    console.warn('Warning: @sendgrid/mail not available, using dev mode');
    sgMail = null;
  }
}

export async function sendVerificationCode(
  email: string,
  code: string
): Promise<void> {
  if (isDev || !sgMail) {
    console.log(`[DEV MAIL] To: ${email} | Code: ${code}`);
    return;
  }
  await sgMail.send({
    to: email,
    from: 'noreply@ailaopo.online',
    subject: 'Your Verification Code',
    html: `<p>Your verification code is: <b>${code}</b></p>
           <p>Valid for 10 minutes.</p>`,
  });
}

initSendGrid();
