import { z } from 'zod';
import { PREVIEW_MAX_LENGTH } from '../config';

export const markdownPreviewSchema = z.object({
  md: z.string()
    .min(1, 'Markdown 内容不能为空')
    .max(PREVIEW_MAX_LENGTH, `Markdown 内容不能超过${PREVIEW_MAX_LENGTH}个字符`),
});
