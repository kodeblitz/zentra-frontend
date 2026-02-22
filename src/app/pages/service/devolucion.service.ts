import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface DevolucionVentaDetalle {
    id?: number;
    documentoVentaDetalle?: { id: number };
    cantidadDevuelta?: number;
    motivo?: string;
}

export interface DevolucionVenta {
    id?: number;
    documentoVenta?: { id: number };
    fechaDevolucion?: string;
    /** Timestamp de creación (ISO). Para mostrar hora real en listados. */
    creadoEn?: string;
    estado?: string;
    documentoVentaNc?: { id: number };
    documentoVentaCambio?: { id: number };
    observaciones?: string;
    detalle?: DevolucionVentaDetalle[];
}

@Injectable({ providedIn: 'root' })
export class DevolucionService {
    private path = '/devoluciones-venta';

    constructor(private api: ApiService) {}

    list(): Observable<DevolucionVenta[]> {
        return this.api.get<DevolucionVenta[]>(this.path);
    }

    listPorDocumento(documentoVentaId: number): Observable<DevolucionVenta[]> {
        return this.api.get<DevolucionVenta[]>(`${this.path}/por-documento/${documentoVentaId}`);
    }

    listPorEstado(estado: string): Observable<DevolucionVenta[]> {
        return this.api.get<DevolucionVenta[]>(`${this.path}/por-estado`, { estado });
    }

    getById(id: number): Observable<DevolucionVenta> {
        return this.api.get<DevolucionVenta>(`${this.path}/${id}`);
    }

    create(item: DevolucionVenta): Observable<void> {
        return this.api.post<void>(this.path, item);
    }

    update(item: DevolucionVenta): Observable<void> {
        return this.api.put<void>(this.path, item);
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }

    aprobar(id: number, generarNotaCredito = true): Observable<unknown> {
        return this.api.post<unknown>(`${this.path}/${id}/aprobar?generarNotaCredito=${generarNotaCredito}`, {});
    }

    rechazar(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/rechazar`, {});
    }
}
