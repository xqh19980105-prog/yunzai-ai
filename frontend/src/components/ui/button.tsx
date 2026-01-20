import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#0066FF] text-white hover:bg-[#0052CC] shadow-soft hover:shadow-soft-md active:scale-[0.98]',
        destructive: 'bg-[#FF4D4F] text-white hover:bg-[#FF3333] shadow-soft hover:shadow-soft-md active:scale-[0.98]',
        outline: 'border border-[#E5E5E5] bg-white hover:bg-[#FAFAFA] shadow-soft hover:shadow-soft-md',
        ghost: 'hover:bg-[#FAFAFA] active:bg-[#F5F5F5]',
        link: 'text-[#0066FF] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm leading-[20px]',
        sm: 'h-9 rounded-full px-4 text-sm leading-[20px]',
        lg: 'h-11 rounded-full px-8 text-base leading-[24px]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
