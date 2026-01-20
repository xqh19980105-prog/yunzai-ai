import { z } from 'zod';

/**
 * 更新法律文本DTO Schema
 */
export const updateLegalTextSchema = z.object({
  text: z
    .string({ message: '法律文本必须是字符串' })
    .min(1, '法律文本不能为空')
    .min(10, '法律文本长度至少为10个字符'),
});

export type UpdateLegalTextDto = z.infer<typeof updateLegalTextSchema>;
