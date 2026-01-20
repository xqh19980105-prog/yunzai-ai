import { z } from 'zod';

/**
 * 登录表单验证Schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, '请填写邮箱')
    .email('邮箱格式无效'),
  password: z
    .string()
    .min(1, '请填写密码'),
});

/**
 * 注册表单验证Schema
 */
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, '请填写邮箱')
    .email('邮箱格式无效'),
  password: z
    .string()
    .min(8, '密码长度至少为8位'),
  confirmPassword: z
    .string()
    .min(1, '请确认密码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
