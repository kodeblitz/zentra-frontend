import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface PagoAplicacion {
    id?: number;
    tipoAplicacion: 'DOCUMENTO' | 'CUOTA';
    documentoVenta?: { id: number };
    creditoCuota?: { id: number };
    montoAplicado: number;
}

export interface Pago {
    id?: number;
    cliente?: { id: number };
    fechaPago: string;
    moneda?: { id: number };
    montoTotal: number;
    medioPago?: { id: number };
    referencia?: string;
    observaciones?: string;
    aplicaciones?: PagoAplicacion[];
}

@Injectable({ providedIn: 'root' })
export class PagoService {
    private path = '/pagos';

    constructor(private api: ApiService) {}

    list(): Observable<Pago[]> {
        return this.api.get<Pago[]>(this.path);
    }

    listPorCliente(clienteId: number): Observable<Pago[]> {
        return this.api.get<Pago[]>(`${this.path}/por-cliente/${clienteId}`);
    }

    getById(id: number): Observable<Pago> {
        return this.api.get<Pago>(`${this.path}/${id}`);
    }

    registrar(pago: Pago): Observable<Pago> {
        return this.api.post<Pago>(this.path, pago);
    }
}
