/**
 * Vitest 测试环境配置
 * 在运行测试前进行全局设置
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// 清理 DOM（在每个测试后）
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage (基础实现，具体测试文件中会覆盖)
// 注意：每个测试文件可以创建自己的 localStorage mock
if (typeof global.localStorage === 'undefined') {
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    get length() {
      return 0;
    },
    key: vi.fn(() => null),
  };
  global.localStorage = localStorageMock as any;
}

// Mock StorageEvent for multi-tab testing
global.StorageEvent = class StorageEvent extends Event {
  key: string | null;
  newValue: string | null;
  oldValue: string | null;
  storageArea: Storage | null;
  url: string;

  constructor(type: string, eventInitDict?: StorageEventInit) {
    super(type);
    this.key = eventInitDict?.key || null;
    this.newValue = eventInitDict?.newValue || null;
    this.oldValue = eventInitDict?.oldValue || null;
    this.storageArea = eventInitDict?.storageArea || null;
    this.url = eventInitDict?.url || '';
  }
} as any;
