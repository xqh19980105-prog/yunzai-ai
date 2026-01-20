import { z } from 'zod';

/**
 * 激活码输入表单验证Schema
 */
export const activationSchema = z.object({
  code: z
    .string()
    .min(1, '请输入激活码')
    .regex(/^[A-Z0-9]+$/, '激活码格式无效，只能包含大写字母和数字')
    .min(4, '激活码长度至少为4位')
    .max(100, '激活码长度不能超过100位'),
});

export type ActivationFormData = z.infer<typeof activationSchema>;
