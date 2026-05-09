// jest.setup.js
import '@testing-library/jest-dom';

// Mock window.matchMedia
const matchMediaMock = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
}));

if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock,
    });
}

// Mock localStorage
let localStorageState = {};
const localStorageMock = {
    getItem: jest.fn((key) =>
        Object.prototype.hasOwnProperty.call(localStorageState, key)
            ? localStorageState[key]
            : null
    ),
    setItem: jest.fn((key, value) => {
        localStorageState[key] = String(value);
    }),
    removeItem: jest.fn((key) => {
        delete localStorageState[key];
    }),
    clear: jest.fn(() => {
        localStorageState = {};
    }),
};
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

// Mock fetch if not already mocked
if (!global.fetch) {
    global.fetch = jest.fn();
}

// Suppress console errors in tests (optional)
global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
};
