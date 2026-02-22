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

/** Timbrado (facturación física Paraguay) con vigencia. */
export interface TimbradoRef {
    id?: number;
    numeroTimbrado?: string;
    fechaInicioVigencia?: string;
    fechaFinVigencia?: string;
    activo?: boolean;
}

/** Empresa (datos para cabecera de factura). */
export interface EmpresaRef {
    id?: number;
    razonSocial?: string;
    nombreFantasia?: string;
    ruc?: string;
    dv?: string;
    direccion?: string;
    telefono?: string;
    correo?: string;
}

/** Cliente (datos para factura). */
export interface ClienteRef {
    id?: number;
    razonSocial?: string;
    ruc?: string;
    direccion?: string;
    telefono?: string;
}

export interface DocumentoVenta {
    id?: number;
    empresa?: EmpresaRef | { id: number };
    cliente?: ClienteRef | { id: number };
    tipoDocumento?: { id: number; nombre?: string; codigoSet?: string };
    establecimiento?: string;
    puntoEmision?: string;
    numero?: string;
    timbrado?: TimbradoRef;
    fechaEmision?: string;
    fechaVencimiento?: string;
    moneda?: { id: number; codigo?: string };
    subtotal?: number;
    descuentoTotal?: number;
    totalIva?: number;
    total?: number;
    estado?: string;
    condicionPago?: { id: number; nombre?: string; codigo?: string };
    observaciones?: string;
    /** Fecha y hora de creación (ISO-8601). Se usa para mostrar hh:mm:ss en listados. */
    creadoEn?: string;
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

    /** Crea una factura desde el PDV (venta in situ) sin crear pedido. Devuelve id, numero y estado. */
    facturaInSitu(request: {
        clienteId: number;
        observaciones?: string;
        detalle: Array<{
            productoId: number;
            descripcion?: string;
            cantidad: number;
            precioUnitario: number;
            descuento?: number;
            descuentoMonto?: number;
            totalLinea?: number;
        }>;
    }): Observable<{ id: number; numero?: string; numeroCompleto?: string; estado?: string }> {
        return this.api.post<{ id: number; numero?: string; numeroCompleto?: string; estado?: string }>(`${this.path}/factura-in-situ`, request);
    }

    emitir(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/emitir`, {});
    }

    anular(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/anular`, {});
    }
}
