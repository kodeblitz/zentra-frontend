import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface MovimientoCaja {
    id?: number;
    tipo: string;
    monto: number;
    concepto?: string;
    fechaHora?: string;
    referencia?: string;
    observaciones?: string;
}

export interface Caja {
    id?: number;
    numero?: string;
    fechaApertura?: string;
    fechaCierre?: string;
    montoApertura?: number;
    montoCierreEsperado?: number;
    montoCierreReal?: number;
    estado?: string;
    observacionesApertura?: string;
    observacionesCierre?: string;
    movimientos?: MovimientoCaja[];
}

/** Desglose por denominación en guaraníes (billetes y monedas Paraguay). */
export interface DenominacionCaja {
    valorPyg: number;
    cantidad: number;
}

/** Respuesta del backend para una fila de desglose (apertura o cierre). */
export interface CajaDenominacion {
    id?: number;
    tipo: string;
    valorPyg: number;
    cantidad: number;
}

/** Denominaciones oficiales PYG: billetes 100.000 → 2.000, monedas 1.000 → 50 (orden de mayor a menor). */
export const DENOMINACIONES_PYG = [100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000, 500, 100, 50] as const;

@Injectable({ providedIn: 'root' })
export class CajaService {
    private path = '/caja';

    constructor(private api: ApiService) {}

    list(estado?: string): Observable<Caja[]> {
        const params = estado ? { estado } : {};
        return this.api.get<Caja[]>(this.path, params as Record<string, string>);
    }

    getAbierta(): Observable<Caja | null> {
        return this.api.get<Caja | null>(`${this.path}/abierta`);
    }

    getById(id: number): Observable<Caja> {
        return this.api.get<Caja>(`${this.path}/${id}`);
    }

    getMovimientos(id: number): Observable<MovimientoCaja[]> {
        return this.api.get<MovimientoCaja[]>(`${this.path}/${id}/movimientos`);
    }

    getSaldoEsperado(id: number): Observable<{ saldoEsperado: number }> {
        return this.api.get<{ saldoEsperado: number }>(`${this.path}/${id}/saldo-esperado`);
    }

    abrir(montoApertura: number, observaciones?: string, denominaciones?: DenominacionCaja[]): Observable<Caja> {
        const body: Record<string, unknown> = { montoApertura, observaciones };
        if (denominaciones?.length) body['denominaciones'] = denominaciones;
        return this.api.post<Caja>(`${this.path}/abrir`, body);
    }

    cerrar(id: number, montoCierreReal: number, observaciones?: string, denominaciones?: DenominacionCaja[]): Observable<void> {
        const body: Record<string, unknown> = { montoCierreReal, observaciones };
        if (denominaciones?.length) body['denominaciones'] = denominaciones;
        return this.api.post<void>(`${this.path}/${id}/cerrar`, body);
    }

    getDenominaciones(cajaId: number): Observable<CajaDenominacion[]> {
        return this.api.get<CajaDenominacion[]>(`${this.path}/${cajaId}/denominaciones`);
    }

    agregarMovimiento(
        cajaId: number,
        tipo: string,
        monto: number,
        concepto?: string,
        referencia?: string,
        observaciones?: string
    ): Observable<MovimientoCaja> {
        return this.api.post<MovimientoCaja>(`${this.path}/${cajaId}/movimientos`, {
            tipo,
            monto,
            concepto,
            referencia,
            observaciones
        });
    }
}
