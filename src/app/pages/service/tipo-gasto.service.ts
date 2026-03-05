import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface TipoGasto {
    id?: number;
    codigo?: string;
    nombre?: string;
    descripcion?: string;
    activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TipoGastoService {
    private path = '/tipos-gasto';

    constructor(private api: ApiService) {}

    list(): Observable<TipoGasto[]> {
        return this.api.get<TipoGasto[]>(this.path);
    }

    listActivos(): Observable<TipoGasto[]> {
        return this.api.get<TipoGasto[]>(`${this.path}/activos`);
    }

    getById(id: number): Observable<TipoGasto> {
        return this.api.get<TipoGasto>(`${this.path}/${id}`);
    }

    create(item: TipoGasto): Observable<void> {
        return this.api.post<void>(this.path, item);
    }

    update(item: TipoGasto): Observable<void> {
        return this.api.put<void>(this.path, item);
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }
}
