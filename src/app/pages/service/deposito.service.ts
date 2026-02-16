import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface Deposito {
    id?: number;
    codigo?: string;
    nombre?: string;
    activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class DepositoService {
    private path = '/depositos';

    constructor(private api: ApiService) {}

    list(): Observable<Deposito[]> {
        return this.api.get<Deposito[]>(this.path);
    }

    getById(id: number): Observable<Deposito> {
        return this.api.get<Deposito>(`${this.path}/${id}`);
    }
}
