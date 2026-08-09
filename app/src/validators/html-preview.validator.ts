import { z } from 'zod';
import { PREVIEW_MAX_LENGTH } from '../config';

export const htmlPreviewSchema = z.object({
  html: z.string()
    .min(1, 'HTML 内容不能为空')
    .max(PREVIEW_MAX_LENGTH, `HTML 内容不能超过${PREVIEW_MAX_LENGTH}个字符`),
});
