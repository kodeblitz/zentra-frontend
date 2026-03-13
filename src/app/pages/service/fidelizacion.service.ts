import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface FidelizacionNivel {
    id?: number;
    nombre?: string;
    orden?: number;
    montoMinimo?: number;
    beneficioPorcentaje?: number;
}

export interface ProgramaFidelizacion {
    id?: number;
    tipo?: string;
    nombre?: string;
    activo?: boolean;
    montoPorPunto?: number;
    valorPunto?: number;
    porcentajeCashback?: number;
    niveles?: FidelizacionNivel[];
}

export interface ClienteFidelizacionDTO {
    inscrito?: boolean;
    puntosDisponibles?: number;
    puntosAcumuladosTotal?: number;
    montoAcumulado?: number;
    nivel?: FidelizacionNivel;
    saldoCashback?: number;
    descuentoNivel?: number;
}

export interface MovimientoFidelizacion {
    id?: number;
    tipo?: string;
    puntos?: number;
    monto?: number;
    descripcion?: string;
    creadoEn?: string;
    programa?: { id?: number; nombre?: string; tipo?: string };
    documentoVenta?: { id?: number; numero?: string };
}

export interface FidelizacionDashboard {
    clientesInscritos?: number;
    totalPuntosEmitidos?: number;
    totalPuntosCanjeados?: number;
    totalCashbackAcumulado?: number;
    programas?: ProgramaFidelizacion[];
    distribucionNiveles?: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class FidelizacionService {
    private path = '/fidelizacion';

    constructor(private api: ApiService) {}

    listarProgramas(): Observable<ProgramaFidelizacion[]> {
        return this.api.get<ProgramaFidelizacion[]>(`${this.path}/programas`);
    }

    actualizarPrograma(programa: ProgramaFidelizacion): Observable<ProgramaFidelizacion> {
        return this.api.put<ProgramaFidelizacion>(`${this.path}/programas`, programa);
    }

    listarNiveles(programaId: number): Observable<FidelizacionNivel[]> {
        return this.api.get<FidelizacionNivel[]>(`${this.path}/programas/${programaId}/niveles`);
    }

    actualizarNiveles(programaId: number, niveles: FidelizacionNivel[]): Observable<FidelizacionNivel[]> {
        return this.api.put<FidelizacionNivel[]>(`${this.path}/programas/${programaId}/niveles`, niveles);
    }

    estadoCliente(clienteId: number): Observable<ClienteFidelizacionDTO> {
        return this.api.get<ClienteFidelizacionDTO>(`${this.path}/cliente/${clienteId}`);
    }

    canjearPuntos(clienteId: number, puntos: number): Observable<{ descuento: number; puntos: number }> {
        return this.api.post<{ descuento: number; puntos: number }>(`${this.path}/cliente/${clienteId}/canjear-puntos`, { puntos });
    }

    aplicarCashback(clienteId: number, monto: number): Observable<{ aplicado: number }> {
        return this.api.post<{ aplicado: number }>(`${this.path}/cliente/${clienteId}/aplicar-cashback`, { monto });
    }

    movimientos(clienteId?: number, limit = 100): Observable<MovimientoFidelizacion[]> {
        const params: Record<string, string> = { limit: limit.toString() };
        if (clienteId) params['clienteId'] = clienteId.toString();
        return this.api.get<MovimientoFidelizacion[]>(`${this.path}/movimientos`, params);
    }

    dashboard(): Observable<FidelizacionDashboard> {
        return this.api.get<FidelizacionDashboard>(`${this.path}/dashboard`);
    }
}
