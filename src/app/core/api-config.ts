/**
 * URL base del API backend. En producción reemplazar por variable de entorno o build.
 */
export const API_BASE_URL = typeof (window as any).__ZENTRA_API__ !== 'undefined'
    ? (window as any).__ZENTRA_API__
    : 'http://localhost:8081';
