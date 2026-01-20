'use client';

import { useEffect, useRef, useState } from 'react';

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
}

export function Turnstile({ siteKey, onVerify, onError, theme = 'auto' }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    if ((window as any).turnstile) {
      setIsLoaded(true);
      return;
    }

    // Load Cloudflare Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      // Only remove script if we added it
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !siteKey) return;

    // Render Turnstile widget
    try {
      const widgetId = (window as any).turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: theme,
        callback: (token: string) => {
          onVerify(token);
        },
        'error-callback': () => {
          if (onError) {
            onError();
          }
        },
      });
      widgetIdRef.current = widgetId;
    } catch (error) {
      console.error('Turnstile render error:', error);
      if (onError) {
        onError();
      }
    }
  }, [isLoaded, siteKey, theme, onVerify, onError]);

  return <div ref={containerRef} className="flex justify-center" />;
}
