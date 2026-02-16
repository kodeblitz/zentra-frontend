import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface StockActual {
    depositoId?: number;
    productoId?: number;
    deposito?: { id: number; nombre?: string; codigo?: string };
    producto?: { id: number; nombre?: string; codigo?: string };
    cantidad?: number;
    actualizadoEn?: string;
}

@Injectable({ providedIn: 'root' })
export class StockActualService {
    private path = '/stock-actual';

    constructor(private api: ApiService) {}

    list(): Observable<StockActual[]> {
        return this.api.get<StockActual[]>(this.path);
    }

    listPorDeposito(depositoId: number): Observable<StockActual[]> {
        return this.api.get<StockActual[]>(`${this.path}/por-deposito/${depositoId}`);
    }

    listPorProducto(productoId: number): Observable<StockActual[]> {
        return this.api.get<StockActual[]>(`${this.path}/por-producto/${productoId}`);
    }
}
