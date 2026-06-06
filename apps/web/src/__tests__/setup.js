import '@testing-library/jest-dom';

// Silence noisy console.error in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
    originalConsoleError(...args);
  };
});
afterAll(() => { console.error = originalConsoleError; });
