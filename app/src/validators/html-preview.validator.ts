import { z } from 'zod';

export const htmlPreviewSchema = z.object({
  html: z.string()
    .min(1, 'HTML 内容不能为空')
    .max(500000, 'HTML 内容不能超过500000个字符'),
});
