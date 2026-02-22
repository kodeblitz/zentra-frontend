/**
 * Convierte un número entero a su representación en letras en español (Paraguay).
 * Uso típico: total a pagar en facturas (ej. 2300000 → "dos millones trescientos mil").
 */
const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const DECENAS_ESP = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function centenas(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const r = n % 100;
  const rest = r > 0 ? ' ' + hasta999(r) : '';
  return (CENTENAS[c] || '') + rest;
}

function hasta99(n: number): string {
  if (n < 10) return UNIDADES[n] || '';
  if (n < 20) return DECENAS_ESP[n - 10] || '';
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (u === 0) return DECENAS[d] || '';
  if (d === 2) return 'veinti' + UNIDADES[u];
  return (DECENAS[d] || '') + ' y ' + UNIDADES[u];
}

function hasta999(n: number): string {
  if (n < 100) return hasta99(n);
  return centenas(n);
}

export function numeroALetras(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '';
  const entero = Math.floor(Math.abs(value));
  if (entero === 0) return 'cero';

  const millones = Math.floor(entero / 1_000_000);
  const miles = Math.floor((entero % 1_000_000) / 1000);
  const resto = entero % 1000;

  const parts: string[] = [];
  if (millones > 0) {
    if (millones === 1) parts.push('un millón');
    else parts.push(hasta999(millones) + ' millones');
  }
  if (miles > 0) {
    if (miles === 1) parts.push('mil');
    else parts.push(hasta999(miles) + ' mil');
  }
  if (resto > 0) parts.push(hasta999(resto));
  const result = parts.join(' ').trim();
  return result ? result.charAt(0).toUpperCase() + result.slice(1) : '';
}
