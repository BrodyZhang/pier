import { z } from 'zod';

export const markdownPreviewSchema = z.object({
  md: z.string()
    .min(1, 'Markdown 内容不能为空')
    .max(500000, 'Markdown 内容不能超过500000个字符'),
});
