import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface DocumentoVentaDetalle {
    id?: number;
    nroLinea?: number;
    producto?: { id: number };
    descripcion?: string;
    cantidad?: number;
    precioUnitario?: number;
    descuento?: number;
    subtotal?: number;
    ivaPorcentaje?: number;
    ivaMonto?: number;
    totalLinea?: number;
}

export interface DocumentoVenta {
    id?: number;
    empresa?: { id: number };
    cliente?: { id: number };
    tipoDocumento?: { id: number };
    establecimiento?: string;
    puntoEmision?: string;
    numero?: string;
    fechaEmision?: string;
    fechaVencimiento?: string;
    moneda?: { id: number };
    subtotal?: number;
    descuentoTotal?: number;
    totalIva?: number;
    total?: number;
    estado?: string;
    condicionPago?: { id: number };
    observaciones?: string;
    detalle?: DocumentoVentaDetalle[];
}

@Injectable({ providedIn: 'root' })
export class DocumentoVentaService {
    private path = '/documentos-venta';

    constructor(private api: ApiService) {}

    list(): Observable<DocumentoVenta[]> {
        return this.api.get<DocumentoVenta[]>(this.path);
    }

    listPorCliente(clienteId: number): Observable<DocumentoVenta[]> {
        return this.api.get<DocumentoVenta[]>(`${this.path}/por-cliente/${clienteId}`);
    }

    listPorFechas(desde: string, hasta: string): Observable<DocumentoVenta[]> {
        return this.api.get<DocumentoVenta[]>(`${this.path}/por-fechas`, { desde, hasta });
    }

    getById(id: number): Observable<DocumentoVenta> {
        return this.api.get<DocumentoVenta>(`${this.path}/${id}`);
    }

    create(item: DocumentoVenta): Observable<void> {
        return this.api.post<void>(this.path, item);
    }

    update(item: DocumentoVenta): Observable<void> {
        return this.api.put<void>(this.path, item);
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }

    emitir(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/emitir`, {});
    }

    anular(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/anular`, {});
    }
}
