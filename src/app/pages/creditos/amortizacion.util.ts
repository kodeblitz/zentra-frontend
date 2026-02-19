/**
 * Cálculo de cuotas (Francés y Alemán) alineado con el backend AmortizacionUtil.
 * Tasa anual en porcentaje (ej. 12 = 12%). Cuotas mensuales: i = tasaAnual/100/12.
 */
export interface CuotaCalculada {
    nroCuota: number;
    fechaVencimiento: string; // YYYY-MM-DD
    montoCapital: number;
    montoInteres: number;
    montoCuota: number;
    saldoInsoluto: number;
}

function round4(value: number): number {
    return Math.round(value * 1e4) / 1e4;
}

function addMonths(dateStr: string, months: number): string {
    const d = new Date(dateStr + 'T12:00:00');
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
}

/** Sistema Francés: cuota fija. */
function generarFrances(
    principal: number,
    i: number,
    n: number,
    fechaPrimerVenc: string
): CuotaCalculada[] {
    const out: CuotaCalculada[] = [];
    let cuotaFija: number;
    if (i === 0) {
        cuotaFija = round4(principal / n);
    } else {
        const unoMasI = 1 + i;
        const unoMasIPowN = Math.pow(unoMasI, n);
        const factor = (i * unoMasIPowN) / (unoMasIPowN - 1);
        cuotaFija = round4(principal * factor);
    }
    let saldo = round4(principal);
    for (let k = 1; k <= n; k++) {
        const venc = addMonths(fechaPrimerVenc, k - 1);
        const interes = round4(saldo * i);
        let capital = round4(cuotaFija - interes);
        if (k === n) {
            capital = saldo;
            cuotaFija = round4(capital + interes);
        }
        saldo = round4(saldo - capital);
        if (saldo < 0) saldo = 0;
        out.push({
            nroCuota: k,
            fechaVencimiento: venc,
            montoCapital: capital,
            montoInteres: interes,
            montoCuota: cuotaFija,
            saldoInsoluto: saldo
        });
    }
    return out;
}

/** Sistema Alemán: amortización constante. */
function generarAleman(
    principal: number,
    i: number,
    n: number,
    fechaPrimerVenc: string
): CuotaCalculada[] {
    const out: CuotaCalculada[] = [];
    const capitalFijo = round4(principal / n);
    let saldo = round4(principal);
    for (let k = 1; k <= n; k++) {
        const venc = addMonths(fechaPrimerVenc, k - 1);
        const interes = round4(saldo * i);
        const capital = k === n ? saldo : capitalFijo;
        const cuota = round4(capital + interes);
        saldo = round4(saldo - capital);
        if (saldo < 0) saldo = 0;
        out.push({
            nroCuota: k,
            fechaVencimiento: venc,
            montoCapital: capital,
            montoInteres: interes,
            montoCuota: cuota,
            saldoInsoluto: saldo
        });
    }
    return out;
}

/**
 * Genera la tabla de amortización.
 * @param montoTotal Capital (P)
 * @param tasaAnualPercent Tasa anual en porcentaje (12 = 12%)
 * @param nroCuotas Número de cuotas mensuales
 * @param fechaPrimerVencimiento Fecha primer vencimiento (YYYY-MM-DD)
 * @param sistema 'FR' (Francés) o 'AL' (Alemán)
 */
export function generarCuotas(
    montoTotal: number,
    tasaAnualPercent: number,
    nroCuotas: number,
    fechaPrimerVencimiento: string,
    sistema: 'FR' | 'AL'
): CuotaCalculada[] {
    if (montoTotal <= 0 || nroCuotas <= 0) return [];
    const tasaDecimal = (tasaAnualPercent ?? 0) / 100;
    const i = tasaDecimal / 12;
    const principal = round4(montoTotal);
    if (sistema === 'AL') return generarAleman(principal, i, nroCuotas, fechaPrimerVencimiento);
    return generarFrances(principal, i, nroCuotas, fechaPrimerVencimiento);
}
