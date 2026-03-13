import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
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
    private caches = new Map<string, { obs$: Observable<any>; time: number }>();
    private readonly CACHE_TTL = 60 * 1000;

    constructor(private api: ApiService) {}

    private cached<T>(key: string, factory: () => Observable<T>): Observable<T> {
        const entry = this.caches.get(key);
        const now = Date.now();
        if (entry && now - entry.time < this.CACHE_TTL) {
            return entry.obs$ as Observable<T>;
        }
        const obs$ = factory().pipe(shareReplay(1));
        this.caches.set(key, { obs$, time: now });
        return obs$;
    }

    invalidar(): void {
        this.caches.clear();
    }

    list(): Observable<StockActual[]> {
        return this.cached('all', () => this.api.get<StockActual[]>(this.path));
    }

    listPorDeposito(depositoId: number): Observable<StockActual[]> {
        return this.cached(`dep-${depositoId}`, () => this.api.get<StockActual[]>(`${this.path}/por-deposito/${depositoId}`));
    }

    listPorProducto(productoId: number): Observable<StockActual[]> {
        return this.cached(`prod-${productoId}`, () => this.api.get<StockActual[]>(`${this.path}/por-producto/${productoId}`));
    }
}
