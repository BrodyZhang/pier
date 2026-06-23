import { Router, Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { requireAuth } from '../middleware/auth';
import { updateProfileSchema } from '../validators/auth.validator';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const user = await UserService.getById(req.session.userId!);
    if (!user) return res.status(404).send('User not found');
    res.render('profile', {
      title: '个人设置',
      user,
      error: req.query.error || null,
      success: req.query.success || null,
      deleteSent: req.query.deleteSent === '1',
      deleteError: req.query.deleteError || null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.redirect('/profile?error=' + encodeURIComponent('名称不能为空且不超过50个字符'));
    }

    await UserService.updateName(req.session.userId!, parsed.data.name);
    req.session.userName = parsed.data.name;
    res.redirect('/profile?success=' + encodeURIComponent('名称已更新'));
  } catch (err) {
    next(err);
  }
});

router.post('/delete/send-code', requireAuth, async (req: Request, res: Response, next) => {
  const email = req.session.userEmail;
  if (!email) return res.redirect('/auth/login');

  try {
    await AuthService.sendCode(email);
    res.redirect('/profile?deleteSent=1');
  } catch (err) {
    next(err);
  }
});

router.post('/delete/confirm', requireAuth, async (req: Request, res: Response, next) => {
  const { code } = req.body;
  const email = req.session.userEmail;
  if (!email) return res.redirect('/auth/login');

  if (!code || !/^\d{6}$/.test(code)) {
    return res.redirect('/profile?deleteSent=1&deleteError=' + encodeURIComponent('验证码为6位数字'));
  }

  try {
    const verification = await AuthService.verifyCode(email, code);
    if (!verification.valid) {
      return res.redirect('/profile?deleteSent=1&deleteError=' + encodeURIComponent('验证码无效或已过期'));
    }

    await UserService.delete(req.session.userId!);

    req.session.destroy(() => {
      res.redirect('/');
    });
  } catch (err) {
    next(err);
  }
});

export default router;
