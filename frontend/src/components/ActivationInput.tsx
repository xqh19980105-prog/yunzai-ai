'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api/axios';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { activationSchema, type ActivationFormData } from '@/lib/validations/activation.schema';

interface ActivationInputProps {
  onSuccess?: () => void;
}

export function ActivationInput({ onSuccess }: ActivationInputProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ActivationFormData>({
    resolver: zodResolver(activationSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: ActivationFormData) => {
    try {
      // Step 1: Activation Input -> Call API
      await api.post('/api/activation/use', {
        code: data.code.trim(),
      });

      toast.success('激活成功！');
      reset();
      
      // Refresh user data to check membership status
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '激活失败，请检查激活码');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input
          type="text"
          placeholder="请输入激活码"
          {...register('code', {
            onChange: (e) => {
              // 自动转换为大写
              const upperValue = e.target.value.toUpperCase();
              e.target.value = upperValue;
            },
          })}
          disabled={isSubmitting}
          className={`text-center text-lg font-mono ${
            errors.code ? 'border-red-300 focus:ring-red-500' : ''
          }`}
        />
        {errors.code && (
          <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            激活中...
          </>
        ) : (
          '激活'
        )}
      </Button>
    </form>
  );
}
