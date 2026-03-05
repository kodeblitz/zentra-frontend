import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface CompraDetalle {
    id?: number;
    nroLinea?: number;
    producto?: { id: number };
    descripcion?: string;
    cantidad?: number;
    precioUnitario?: number;
    totalLinea?: number;
}

export interface Compra {
    id?: number;
    proveedor?: { id: number };
    numero?: string;
    fechaCompra?: string;
    estado?: string;
    moneda?: { id: number };
    /** Tipo de cambio (1 unidad moneda = X Gs.) cuando moneda != PYG. Historial de precios de compra. */
    cotizacion?: number;
    subtotal?: number;
    total?: number;
    observaciones?: string;
    detalle?: CompraDetalle[];
}

@Injectable({ providedIn: 'root' })
export class CompraService {
    private path = '/compras';

    constructor(private api: ApiService) {}

    list(): Observable<Compra[]> {
        return this.api.get<Compra[]>(this.path);
    }

    getById(id: number): Observable<Compra> {
        return this.api.get<Compra>(`${this.path}/${id}`);
    }

    listPorProveedor(proveedorId: number): Observable<Compra[]> {
        return this.api.get<Compra[]>(`${this.path}/por-proveedor/${proveedorId}`);
    }

    listPorEstado(estado: string): Observable<Compra[]> {
        return this.api.get<Compra[]>(`${this.path}/por-estado`, { estado });
    }

    create(item: Compra): Observable<void> {
        return this.api.post<void>(this.path, item);
    }

    update(item: Compra): Observable<void> {
        return this.api.put<void>(this.path, item);
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }
}
