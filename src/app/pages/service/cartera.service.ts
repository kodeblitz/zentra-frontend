import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface SaldoClienteDTO {
    clienteId: number;
    razonSocial: string;
    saldoDocumentos: number;
    saldoCreditos: number;
    saldoTotal: number;
}

export interface DocumentoSaldoDTO {
    documentoVentaId: number;
    clienteId: number;
    razonSocial: string;
    numero: string;
    fechaEmision: string;
    fechaVencimiento: string;
    total: number;
    saldoPendiente: number;
    diasVencido: number;
}

export interface CarteraAgingDTO {
    rango0_30: number;
    rango31_60: number;
    rango61_90: number;
    rango91Mas: number;
    total: number;
    detalle: DocumentoSaldoDTO[];
}

export interface CuotaSaldoDTO {
    cuotaId: number;
    nroCuota: number;
    fechaVencimiento?: string;
    montoCuota?: number;
    /** Interés moratorio (cuota vencida). */
    montoMora?: number;
    /** Total a pagar por esta cuota (monto cuota + mora - aplicado). */
    saldoPendiente: number;
    /** Capital pendiente (para cancelación anticipada). */
    capitalPendiente?: number;
    /** true si la cuota vence en el futuro (pago adelantado). */
    adelantada?: boolean;
}

export interface CancelacionAnticipadaDTO {
    montoTotal: number;
    desglose: CuotaSaldoDTO[];
}

export interface CreditoPendienteDTO {
    creditoId: number;
    estado: string;
    montoTotal: number;
    nroCuotas: number;
    cancelacionAnticipada: CancelacionAnticipadaDTO;
}

export interface PendientesClienteDTO {
    documentos: DocumentoSaldoDTO[];
    creditos: CreditoPendienteDTO[];
}

@Injectable({ providedIn: 'root' })
export class CarteraService {
    private path = '/cartera';

    constructor(private api: ApiService) {}

    saldosCliente(): Observable<SaldoClienteDTO[]> {
        return this.api.get<SaldoClienteDTO[]>(`${this.path}/saldos-cliente`);
    }

    documentosConSaldo(): Observable<DocumentoSaldoDTO[]> {
        return this.api.get<DocumentoSaldoDTO[]>(`${this.path}/documentos-con-saldo`);
    }

    aging(fechaCorte?: string): Observable<CarteraAgingDTO> {
        const params = fechaCorte ? { fechaCorte } : {};
        return this.api.get<CarteraAgingDTO>(`${this.path}/aging`, params as Record<string, string>);
    }

    saldoDocumento(documentoVentaId: number): Observable<{ saldoPendiente: number }> {
        return this.api.get<{ saldoPendiente: number }>(`${this.path}/documento/${documentoVentaId}/saldo`);
    }

    /** Saldo a pagar de la cuota. Si se pasa fechaPago (yyyy-MM-dd) y la cuota es adelantada, devuelve capital + interés proporcional. */
    saldoCuota(creditoCuotaId: number, fechaPago?: string): Observable<{ saldoPendiente: number }> {
        const params = fechaPago ? { fechaPago } : {};
        return this.api.get<{ saldoPendiente: number }>(`${this.path}/cuota/${creditoCuotaId}/saldo`, params as Record<string, string>);
    }

    /** Documentos con saldo y créditos con cuotas pendientes del cliente (para registro de pagos). */
    pendientesCliente(clienteId: number): Observable<PendientesClienteDTO> {
        return this.api.get<PendientesClienteDTO>(`${this.path}/pendientes-cliente/${clienteId}`);
    }
}
