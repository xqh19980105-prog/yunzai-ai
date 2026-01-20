import { z } from 'zod';

/**
 * 法律声明签署DTO Schema
 */
export const signLegalSchema = z.object({
  signatureText: z
    .string({ message: '签名文本必须是字符串' })
    .min(1, '签名文本不能为空')
    .regex(/^我承诺合法使用$/, '签名文本必须为"我承诺合法使用"'),
  ip: z
    .string({ message: 'IP地址必须是字符串' })
    .min(1, 'IP地址不能为空')
    .regex(/^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^unknown$/, 'IP地址格式无效'),
  userAgent: z.string({ message: 'User Agent必须是字符串' }).optional(),
});

export type SignLegalDto = z.infer<typeof signLegalSchema>;
