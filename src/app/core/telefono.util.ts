/**
 * Códigos de país para teléfono/celular (formato E.164).
 * label: bandera + código para acortar espacio en el selector.
 */
export const CODIGOS_PAIS_CELULAR = [
    { code: '+595', label: '🇵🇾 +595' },
    { code: '+54', label: '🇦🇷 +54' },
    { code: '+55', label: '🇧🇷 +55' },
    { code: '+598', label: '🇺🇾 +598' },
    { code: '+591', label: '🇧🇴 +591' },
    { code: '+57', label: '🇨🇴 +57' },
    { code: '+593', label: '🇪🇨 +593' },
    { code: '+51', label: '🇵🇪 +51' },
    { code: '+56', label: '🇨🇱 +56' },
    { code: '+1', label: '🇺🇸 +1' },
    { code: '+52', label: '🇲🇽 +52' },
    { code: '+34', label: '🇪🇸 +34' },
    { code: '+49', label: '🇩🇪 +49' },
    { code: '+39', label: '🇮🇹 +39' },
    { code: '+33', label: '🇫🇷 +33' },
    { code: '+44', label: '🇬🇧 +44' },
] as const;

export const CODIGO_PAIS_DEFAULT = '+595';

/** Extrae solo dígitos de un string. */
export function soloDigitos(s: string | undefined | null): string {
    if (s == null) return '';
    return String(s).replace(/\D/g, '');
}

/**
 * Parsea celular guardado (ej. +595981123456) en código país y número local.
 * Si no tiene +, asume Paraguay (+595).
 */
export function parsearCelularGuardado(celular: string | undefined | null): { codigoPais: string; numero: string } {
    const raw = (celular ?? '').trim();
    if (!raw) return { codigoPais: CODIGO_PAIS_DEFAULT, numero: '' };
    if (raw.startsWith('+')) {
        // Buscar el código de país más largo que coincida
        const ordenados = [...CODIGOS_PAIS_CELULAR].sort((a, b) => b.code.length - a.code.length);
        for (const { code } of ordenados) {
            if (raw.startsWith(code)) {
                const resto = raw.slice(code.length);
                return { codigoPais: code, numero: soloDigitos(resto) };
            }
        }
        const digitos = soloDigitos(raw);
        return { codigoPais: CODIGO_PAIS_DEFAULT, numero: digitos };
    }
    return { codigoPais: CODIGO_PAIS_DEFAULT, numero: soloDigitos(raw) };
}

/**
 * Normaliza para guardar: código país + solo dígitos del número (ej. +595981123456).
 */
export function normalizarCelularParaGuardar(codigoPais: string, numero: string): string {
    const dig = soloDigitos(numero);
    if (!dig) return '';
    const cod = (codigoPais ?? '').trim();
    const prefijo = cod.startsWith('+') ? cod : '+' + cod.replace(/\D/g, '');
    if (!prefijo || prefijo === '+') return dig ? '+' + dig : '';
    return prefijo + dig;
}

/**
 * Devuelve el número para wa.me: solo dígitos, sin + (ej. 595981123456).
 */
export function celularParaWhatsApp(celular: string | undefined | null): string {
    if (!celular?.trim()) return '';
    const s = celular.trim();
    const digitos = s.startsWith('+') ? s.slice(1).replace(/\D/g, '') : soloDigitos(s);
    return digitos;
}
