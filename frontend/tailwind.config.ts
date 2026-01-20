import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 豆包风格色彩系统
      colors: {
        // 主色调 - 柔和蓝色
        primary: {
          DEFAULT: '#0066FF',
          50: '#E6F0FF',
          100: '#CCE0FF',
          200: '#99C2FF',
          300: '#66A3FF',
          400: '#3385FF',
          500: '#0066FF',
          600: '#0052CC',
          700: '#003D99',
          800: '#002966',
          900: '#001433',
        },
        // 背景色系
        background: {
          DEFAULT: '#FFFFFF',
          secondary: '#F7F8FA',
          tertiary: '#F0F2F5',
          hover: '#E8EAED',
        },
        // 文字色系
        foreground: {
          DEFAULT: '#1A1A1A',
          secondary: '#666666',
          tertiary: '#999999',
          placeholder: '#BFBFBF',
        },
        // 边框色系
        border: {
          DEFAULT: '#E5E7EB',
          light: '#F0F0F0',
          dark: '#D1D5DB',
        },
        // 卡片
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1A1A1A',
          hover: '#FAFBFC',
        },
        // 静音色
        muted: {
          DEFAULT: '#F3F4F6',
          foreground: '#6B7280',
        },
        // 强调色
        accent: {
          DEFAULT: '#F3F4F6',
          blue: '#E6F0FF',
          green: '#E6F9F0',
          orange: '#FFF4E6',
          red: '#FFE6E6',
        },
        // 状态色
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
        },
        // 侧边栏
        sidebar: {
          DEFAULT: '#FFFFFF',
          hover: '#F7F8FA',
          active: '#E6F0FF',
          border: '#F0F0F0',
        },
      },
      // 圆角系统 - 豆包风格大圆角
      borderRadius: {
        'none': '0',
        'sm': '6px',
        'DEFAULT': '8px',
        'md': '10px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      // 阴影系统 - 柔和阴影
      boxShadow: {
        'none': 'none',
        'soft': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'soft-md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 8px 24px rgba(0, 0, 0, 0.10)',
        'soft-xl': '0 12px 36px rgba(0, 0, 0, 0.12)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'dropdown': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'modal': '0 16px 48px rgba(0, 0, 0, 0.16)',
      },
      // 间距系统 - 宽松间距
      spacing: {
        '4.5': '1.125rem', // 18px
        '5.5': '1.375rem', // 22px
        '13': '3.25rem',   // 52px
        '15': '3.75rem',   // 60px
        '18': '4.5rem',    // 72px
        '22': '5.5rem',    // 88px
      },
      // 字体大小
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['13px', { lineHeight: '18px' }],
        'base': ['14px', { lineHeight: '22px' }],
        'md': ['15px', { lineHeight: '24px' }],
        'lg': ['16px', { lineHeight: '24px' }],
        'xl': ['18px', { lineHeight: '28px' }],
        '2xl': ['20px', { lineHeight: '28px' }],
        '3xl': ['24px', { lineHeight: '32px' }],
        '4xl': ['28px', { lineHeight: '36px' }],
        '5xl': ['32px', { lineHeight: '40px' }],
      },
      // 动画
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      // 过渡
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      // 最大宽度
      maxWidth: {
        'chat': '800px',
        'content': '1200px',
        'sidebar': '280px',
      },
      // 最小高度
      minHeight: {
        'input': '44px',
        'button': '36px',
        'card': '120px',
      },
    },
  },
  plugins: [],
}
export default config
