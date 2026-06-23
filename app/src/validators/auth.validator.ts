import { z } from 'zod';

export const emailSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

export const verifyCodeSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  code: z.string().length(6, '验证码为6位数字').regex(/^\d{6}$/, '验证码为6位数字'),
});

export const updateProfileSchema = z.object({
  name: z.string()
    .min(1, '名称不能为空')
    .max(50, '名称不能超过50个字符'),
});
