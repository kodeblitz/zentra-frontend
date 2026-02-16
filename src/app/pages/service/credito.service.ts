import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface CreditoCuota {
    id?: number;
    nroCuota?: number;
    fechaVencimiento?: string;
    montoCapital?: number;
    montoInteres?: number;
    montoCuota?: number;
    saldoInsoluto?: number;
    estado?: string;
}

export interface Credito {
    id?: number;
    cliente?: { id: number };
    documentoVenta?: { id: number };
    moneda?: { id: number };
    montoTotal?: number;
    tasaInteresAnual?: number;
    nroCuotas?: number;
    sistemaAmort?: string;
    fechaInicio?: string;
    fechaPrimerVencimiento?: string;
    estado?: string;
    observaciones?: string;
    cuotas?: CreditoCuota[];
}

export interface CancelacionAnticipadaDTO {
    montoTotal: number;
    desglose: { cuotaId: number; nroCuota: number; saldoPendiente: number }[];
}

@Injectable({ providedIn: 'root' })
export class CreditoService {
    private path = '/creditos';

    constructor(private api: ApiService) {}

    list(): Observable<Credito[]> {
        return this.api.get<Credito[]>(this.path);
    }

    listPorCliente(clienteId: number): Observable<Credito[]> {
        return this.api.get<Credito[]>(`${this.path}/por-cliente/${clienteId}`);
    }

    listPorEstado(estado: string): Observable<Credito[]> {
        return this.api.get<Credito[]>(`${this.path}/por-estado`, { estado });
    }

    getById(id: number): Observable<Credito> {
        return this.api.get<Credito>(`${this.path}/${id}`);
    }

    create(item: Credito): Observable<void> {
        return this.api.post<void>(this.path, item);
    }

    saldoCancelacionAnticipada(id: number): Observable<CancelacionAnticipadaDTO> {
        return this.api.get<CancelacionAnticipadaDTO>(`${this.path}/${id}/saldo-cancelacion-antecipada`);
    }

    cancelarAnticipado(id: number, request: { fechaPago?: string; medioPagoId?: number; referencia?: string; observaciones?: string }): Observable<unknown> {
        return this.api.post<unknown>(`${this.path}/${id}/cancelar-anticipado`, request);
    }

    adelanto(id: number, request: { monto: number; fechaPago?: string; medioPagoId?: number; referencia?: string; observaciones?: string }): Observable<unknown> {
        return this.api.post<unknown>(`${this.path}/${id}/adelanto`, request);
    }

    recalcularEstado(id: number): Observable<Credito> {
        return this.api.post<Credito>(`${this.path}/${id}/recalcular-estado`, {});
    }
}
