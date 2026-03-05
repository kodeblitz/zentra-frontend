import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface Gasto {
    id?: number;
    tipoGasto?: { id: number };
    fecha?: string;
    monto?: number;
    moneda?: { id: number };
    descripcion?: string;
    numeroReferencia?: string;
    proveedor?: { id: number };
}

@Injectable({ providedIn: 'root' })
export class GastoService {
    private path = '/gastos';

    constructor(private api: ApiService) {}

    list(): Observable<Gasto[]> {
        return this.api.get<Gasto[]>(this.path);
    }

    getById(id: number): Observable<Gasto> {
        return this.api.get<Gasto>(`${this.path}/${id}`);
    }

    listPorFechas(desde: string, hasta: string): Observable<Gasto[]> {
        return this.api.get<Gasto[]>(`${this.path}/por-fechas`, { desde, hasta });
    }

    listPorTipo(tipoGastoId: number): Observable<Gasto[]> {
        return this.api.get<Gasto[]>(`${this.path}/por-tipo/${tipoGastoId}`);
    }

    create(item: Gasto): Observable<void> {
        return this.api.post<void>(this.path, item);
    }

    update(item: Gasto): Observable<void> {
        return this.api.put<void>(this.path, item);
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }
}
