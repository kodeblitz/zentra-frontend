import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface TipoMovimientoRef {
    id?: number;
    codigo?: string;
    nombre?: string;
    sumaStock?: boolean;
}

export interface EstadoMovimientoRef {
    id?: number;
    codigo?: string;
    nombre?: string;
}

export interface MovimientoStock {
    id?: number;
    deposito?: { id: number; nombre?: string; codigo?: string };
    producto?: { id: number; nombre?: string; codigo?: string };
    tipoMovimiento?: TipoMovimientoRef;
    estado?: EstadoMovimientoRef;
    cantidad?: number;
    fechaMovimiento?: string;
    /** Timestamp de creación (ISO). Para mostrar hora real en listados. */
    creadoEn?: string;
    numeroReferencia?: string;
    observacion?: string;
}

@Injectable({ providedIn: 'root' })
export class MovimientoStockService {
    private path = '/movimientos-stock';

    constructor(private api: ApiService) {}

    list(): Observable<MovimientoStock[]> {
        return this.api.get<MovimientoStock[]>(this.path);
    }

    listPorFechas(desde: string, hasta: string): Observable<MovimientoStock[]> {
        return this.api.get<MovimientoStock[]>(`${this.path}/por-fecha`, { desde, hasta });
    }

    create(mov: MovimientoStock): Observable<MovimientoStock> {
        return this.api.post<MovimientoStock>(this.path, mov);
    }

    /** Tipos de movimiento activos (para ajustes: AJUSTE_ENTRADA, AJUSTE_SALIDA). */
    getTiposActivos(): Observable<TipoMovimientoRef[]> {
        return this.api.get<TipoMovimientoRef[]>('/tipos-movimiento/activos');
    }

    /** Estados de movimiento activos (para crear en BORRADOR). */
    getEstadosActivos(): Observable<EstadoMovimientoRef[]> {
        return this.api.get<EstadoMovimientoRef[]>('/estados-movimiento/activos');
    }

    listPorDeposito(depositoId: number): Observable<MovimientoStock[]> {
        return this.api.get<MovimientoStock[]>(`${this.path}/por-deposito/${depositoId}`);
    }

    listPorProducto(productoId: number): Observable<MovimientoStock[]> {
        return this.api.get<MovimientoStock[]>(`${this.path}/por-producto/${productoId}`);
    }

    getById(id: number): Observable<MovimientoStock> {
        return this.api.get<MovimientoStock>(`${this.path}/${id}`);
    }

    confirmar(id: number): Observable<MovimientoStock> {
        return this.api.put<MovimientoStock>(`${this.path}/${id}/confirmar`, {});
    }

    anular(id: number): Observable<MovimientoStock> {
        return this.api.put<MovimientoStock>(`${this.path}/${id}/anular`, {});
    }
}
