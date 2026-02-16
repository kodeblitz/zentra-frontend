import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface Cliente {
    id?: number;
    codigo?: string;
    razonSocial?: string;
    ruc?: string;
    dv?: string;
    tipoCliente?: string;
    direccion?: string;
    ciudad?: string;
    barrio?: string;
    telefono?: string;
    celular?: string;
    correo?: string;
    contacto?: string;
    condicionPago?: { id: number };
    limiteCredito?: number;
    observaciones?: string;
    activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
    private path = '/clientes';

    constructor(private api: ApiService) {}

    list(): Observable<Cliente[]> {
        return this.api.get<Cliente[]>(this.path);
    }

    listActivos(): Observable<Cliente[]> {
        return this.api.get<Cliente[]>(`${this.path}/activos`);
    }

    /** Búsqueda para autocompletado (mín. 2 caracteres). Escalable para muchos clientes. */
    buscar(q: string, limit = 20): Observable<Cliente[]> {
        const term = (q ?? '').trim();
        if (term.length < 2) return of([]);
        return this.api.get<Cliente[]>(`${this.path}/buscar`, { q: term, limit });
    }

    getById(id: number): Observable<Cliente> {
        return this.api.get<Cliente>(`${this.path}/${id}`);
    }

    getByRuc(ruc: string): Observable<Cliente> {
        return this.api.get<Cliente>(`${this.path}/por-ruc/${encodeURIComponent(ruc)}`);
    }

    create(item: Cliente): Observable<void> {
        return this.api.post<void>(this.path, item);
    }

    update(item: Cliente): Observable<void> {
        return this.api.put<void>(this.path, item);
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }

    calcularDv(numero: string): Observable<{ numero: string; dv: number | null }> {
        return this.api.get<{ numero: string; dv: number | null }>(`${this.path}/calcular-dv`, { numero: numero ?? '' });
    }

    validarDv(numero: string, dv: number): Observable<{ valido: boolean }> {
        return this.api.get<{ valido: boolean }>(`${this.path}/validar-dv`, { numero: numero ?? '', dv });
    }
}
