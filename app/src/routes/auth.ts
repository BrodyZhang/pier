import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { emailSchema, verifyCodeSchema } from '../validators/auth.validator';

const router = Router();

const DAILY_LIMIT = 20;

router.get('/register', async (_req: Request, res: Response) => {
  const registered = await AuthService.getDailyRegistrationCount();
  const remainingSlots = Math.max(0, DAILY_LIMIT - registered);
  res.render('auth/register', { title: '注册', error: null, email: '', sent: false, remainingSlots });
});

router.post('/register', async (req: Request, res: Response, next) => {
  try {
    const parsed = emailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.render('auth/register', {
        title: '注册', error: '请输入有效的邮箱地址',
        email: req.body.email, sent: false, remainingSlots: DAILY_LIMIT
      });
    }

    const { email } = parsed.data;
    const registered = await AuthService.getDailyRegistrationCount();
    const remainingSlots = Math.max(0, DAILY_LIMIT - registered);

    if (registered >= DAILY_LIMIT) {
      return res.render('auth/register', {
        title: '注册', error: '今日注册名额已满（20/20），请明天再来。',
        email, sent: false, remainingSlots: 0,
      });
    }

    const existing = await AuthService.login(email);
    if (existing.success) {
      return res.render('auth/register', {
        title: '注册', error: '该邮箱已注册，请登录。',
        email, sent: false, remainingSlots,
      });
    }

    const result = await AuthService.sendCode(email);
    if (!result.success) {
      return res.render('auth/register', {
        title: '注册', error: result.error, email, sent: true, remainingSlots,
      });
    }

    res.render('auth/register', { title: '注册', error: null, email, sent: true, remainingSlots });
  } catch (err) {
    next(err);
  }
});

router.post('/register/verify', async (req: Request, res: Response, next) => {
  try {
    const parsed = verifyCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.render('auth/register', {
        title: '注册', error: '验证码为6位数字', email: req.body.email, sent: true,
      });
    }

    const { email, code } = parsed.data;
    const verification = await AuthService.verifyCode(email, code);
    if (!verification.valid) {
      return res.render('auth/register', {
        title: '注册', error: '验证码无效或已过期。', email, sent: true,
      });
    }

    const registration = await AuthService.register(email);
    if (!registration.success) {
      return res.render('auth/register', {
        title: '注册', error: registration.error, email, sent: true,
      });
    }

    req.session.userId = registration.user!.id;
    req.session.role = registration.user!.role;
    req.session.userName = registration.user!.name || '';
    req.session.userEmail = email;
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

router.get('/login', (_req: Request, res: Response) => {
  res.render('auth/login', { title: '登录', error: null, email: '', sent: false });
});

router.post('/login', async (req: Request, res: Response, next) => {
  try {
    const parsed = emailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.render('auth/login', {
        title: '登录', error: '请输入有效的邮箱地址',
        email: req.body.email, sent: false
      });
    }

    const { email } = parsed.data;
    const login = await AuthService.login(email);
    if (!login.success) {
      return res.render('auth/login', {
        title: '登录', error: login.error, email, sent: false,
      });
    }

    const result = await AuthService.sendCode(email);
    if (!result.success) {
      return res.render('auth/login', {
        title: '登录', error: result.error, email, sent: true,
      });
    }

    res.render('auth/login', { title: '登录', error: null, email, sent: true });
  } catch (err) {
    next(err);
  }
});

router.post('/login/verify', async (req: Request, res: Response, next) => {
  try {
    const parsed = verifyCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.render('auth/login', {
        title: '登录', error: '验证码为6位数字', email: req.body.email, sent: true,
      });
    }

    const { email, code } = parsed.data;
    const verification = await AuthService.verifyCode(email, code);
    if (!verification.valid) {
      return res.render('auth/login', {
        title: '登录', error: '验证码无效或已过期。', email, sent: true,
      });
    }

    const login = await AuthService.login(email);
    if (!login.success) {
      return res.render('auth/login', {
        title: '登录', error: login.error, email, sent: true,
      });
    }

    await AuthService.updateLastLogin(login.user!.id);

    req.session.userId = login.user!.id;
    req.session.role = login.user!.role;
    req.session.userName = login.user!.name || '';
    req.session.userEmail = email;
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

export default router;
