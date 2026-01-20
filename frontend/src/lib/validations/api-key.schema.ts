import { z } from 'zod';

/**
 * API密钥设置表单验证Schema
 */
export const apiKeySchema = z.object({
  apiKey: z
    .string()
    .min(1, '请输入API密钥')
    .min(10, 'API密钥长度至少为10位')
    .max(500, 'API密钥长度不能超过500位')
    .refine(
      (val) => {
        // 不允许占位符（•、·、●等）
        const trimmed = val.trim();
        return !/^[•·●\u2022\u25CF\u00B7\s]+$/.test(trimmed) || trimmed.length > 50;
      },
      {
        message: '请先清空输入框，然后输入新的API密钥',
      }
    ),
  apiBaseUrl: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        try {
          new URL(val.trim());
          return true;
        } catch {
          return false;
        }
      },
      {
        message: 'API地址格式无效',
      }
    ),
});

export type ApiKeyFormData = z.infer<typeof apiKeySchema>;
