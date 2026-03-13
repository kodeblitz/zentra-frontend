/**
 * Cálculo de cuotas (Francés y Alemán) alineado con el backend AmortizacionUtil.
 * Tasa anual en porcentaje (ej. 12 = 12%). Cuotas mensuales: i = tasaAnual/100/12.
 */
export interface CuotaCalculada {
    nroCuota: number;
    fechaVencimiento: string; // YYYY-MM-DD
    montoCapital: number;
    montoInteres: number;
    montoGastoAdmin: number;
    montoSeguro: number;
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
            montoGastoAdmin: 0,
            montoSeguro: 0,
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
            montoGastoAdmin: 0,
            montoSeguro: 0,
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

/**
 * Genera cuotas con cargos adicionales (gastos admin y seguro) que no generan interés.
 * @param gastoAdminTotal Monto total de gastos administrativos (se divide entre las cuotas)
 * @param seguroPorCuota Monto fijo de seguro por cuota
 */
export function generarCuotasConCargos(
    montoTotal: number,
    tasaAnualPercent: number,
    nroCuotas: number,
    fechaPrimerVencimiento: string,
    sistema: 'FR' | 'AL',
    gastoAdminTotal: number,
    seguroPorCuota: number
): CuotaCalculada[] {
    const cuotas = generarCuotas(montoTotal, tasaAnualPercent, nroCuotas, fechaPrimerVencimiento, sistema);
    if (cuotas.length === 0) return cuotas;

    const gAdmin = gastoAdminTotal ?? 0;
    const seguro = seguroPorCuota ?? 0;
    if (gAdmin <= 0 && seguro <= 0) return cuotas;

    const n = cuotas.length;
    const adminPorCuota = gAdmin > 0 ? round4(gAdmin / n) : 0;
    const adminAcumulado = round4(adminPorCuota * n);
    const adminResto = round4(gAdmin - adminAcumulado);

    for (let i = 0; i < n; i++) {
        const c = cuotas[i];
        const ga = i === n - 1 ? round4(adminPorCuota + adminResto) : adminPorCuota;
        c.montoGastoAdmin = ga;
        c.montoSeguro = seguro;
        c.montoCuota = round4(c.montoCapital + c.montoInteres + ga + seguro);
    }
    return cuotas;
}
