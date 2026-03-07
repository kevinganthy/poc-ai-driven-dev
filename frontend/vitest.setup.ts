import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Provide a full localStorage stub so modules that read from it on import don't crash
const store: Record<string, string> = {};
const localStorageMock = {
	getItem: vi.fn((key: string) => store[key] ?? null),
	setItem: vi.fn((key: string, value: string) => {
		store[key] = value;
	}),
	removeItem: vi.fn((key: string) => {
		delete store[key];
	}),
	clear: vi.fn(() => {
		Object.keys(store).forEach((k) => delete store[k]);
	})
};

Object.defineProperty(globalThis, 'localStorage', {
	value: localStorageMock,
	writable: true
});
