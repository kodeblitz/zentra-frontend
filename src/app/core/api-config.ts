/**
 * URL base del API backend.
 * - Con Docker: se inyecta vía window.__ZENTRA_API__ desde el entrypoint.
 * - Con ng serve: se usa el fallback (o definir en index.html para otro host/puerto).
 */
const RAW = typeof (window as any).__ZENTRA_API__ !== 'undefined' ? (window as any).__ZENTRA_API__ : '';
const PLACEHOLDER = '__ZENTRA_API_URL__';
export const API_BASE_URL = (RAW && RAW !== PLACEHOLDER && RAW.startsWith('http'))
    ? RAW.replace(/\/$/, '')
    : 'http://localhost:8080';
