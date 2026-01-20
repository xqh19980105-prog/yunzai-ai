import api from './axios';

export interface SystemConfig {
  site_info?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  scripts?: {
    head?: string;
    body?: string;
  };
  announcement?: string;
  contact_qr?: string;
  sensitive_words?: string[];
  watermark_config?: {
    enabled?: boolean;
    text?: string;
  };
  sidebar_menu?: any;
  buy_link?: string;
  pricing?: {
    buyLink?: string;
    packages?: Array<{
      id: string;
      name: string;
      price: number;
      duration: number;
      description?: string;
    }>;
  };
  packages?: Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
    description?: string;
  }>;
}

export async function getSystemConfig(): Promise<SystemConfig> {
  try {
    const response = await api.get<{ key: string; value: string }[]>('/api/system-config');
    
    // Convert key-value array to object
    const config: SystemConfig = {};
    response.data.forEach((item) => {
      try {
        config[item.key as keyof SystemConfig] = JSON.parse(item.value);
      } catch {
        // If not JSON, use as string
        config[item.key as keyof SystemConfig] = item.value as any;
      }
    });
    
    return config;
  } catch (error) {
    console.error('Failed to fetch system config:', error);
    return {};
  }
}
