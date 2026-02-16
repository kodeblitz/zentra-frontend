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

    saldoCuota(creditoCuotaId: number): Observable<{ saldoPendiente: number }> {
        return this.api.get<{ saldoPendiente: number }>(`${this.path}/cuota/${creditoCuotaId}/saldo`);
    }
}
