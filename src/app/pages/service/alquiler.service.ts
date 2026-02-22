import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface AlquilerDetalle {
    id?: number;
    nroLinea?: number;
    producto?: { id: number };
    descripcion?: string;
    cantidad?: number;
    diasAlquiler?: number;
    precioAlquilerDia?: number;
    montoLinea?: number;
}

export interface Alquiler {
    id?: number;
    cliente?: { id: number };
    numero?: string;
    fechaInicio?: string;
    fechaFinPrevista?: string;
    fechaDevolucion?: string;
    estado?: string;
    total?: number;
    observaciones?: string;
    moneda?: { id: number };
    detalle?: AlquilerDetalle[];
    documentoVenta?: { id: number; numero?: string; estado?: string };
    creadoEn?: string;
}

@Injectable({ providedIn: 'root' })
export class AlquilerService {
    private path = '/alquileres';

    constructor(private api: ApiService) {}

    list(): Observable<Alquiler[]> {
        return this.api.get<Alquiler[]>(this.path);
    }

    getById(id: number): Observable<Alquiler> {
        return this.api.get<Alquiler>(`${this.path}/${id}`);
    }

    create(alquiler: Alquiler): Observable<Alquiler> {
        return this.api.post<Alquiler>(this.path, alquiler);
    }

    update(alquiler: Alquiler): Observable<void> {
        return this.api.put<void>(this.path, alquiler);
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }

    listPorCliente(clienteId: number): Observable<Alquiler[]> {
        return this.api.get<Alquiler[]>(`${this.path}/por-cliente/${clienteId}`);
    }

    confirmar(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/confirmar`, {});
    }

    entregar(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/entregar`, {});
    }

    devolver(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/devolver`, {});
    }

    cancelar(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/cancelar`, {});
    }

    /** Genera la factura en borrador asociada al alquiler (solo BORRADOR o CONFIRMADO, sin factura previa). */
    generarFactura(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/generar-factura`, {});
    }
}
