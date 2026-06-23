import { z } from 'zod';

export const createAgentSchema = z.object({
  name: z.string()
    .min(1, '名称不能为空')
    .max(50, '名称不能超过50个字符'),
  description: z.string()
    .min(1, '描述不能为空')
    .max(500, '描述不能超过500个字符'),
});

export const updateAgentSchema = z.object({
  name: z.string()
    .min(1, '名称不能为空')
    .max(50, '名称不能超过50个字符')
    .optional(),
  description: z.string()
    .min(1, '描述不能为空')
    .max(500, '描述不能超过500个字符')
    .optional(),
});

export const agentIdSchema = z.object({
  id: z.string().uuid('Invalid agent ID'),
});

export const agentSlugSchema = z.object({
  slug: z.string().uuid('Invalid slug format'),
});

export const shareSchema = z.object({
  partnerEmail: z.string().email('请输入有效的邮箱地址'),
});

export const reviewSchema = z.object({
  reason: z.string().max(200, '原因不能超过200个字符').optional(),
  review_notes: z.string().max(200, '审核备注不能超过200个字符').optional(),
  review_comments: z.string().max(200, '审核意见不能超过200个字符').optional(),
});
