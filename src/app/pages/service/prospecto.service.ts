import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface Prospecto {
    id?: number;
    codigo?: string;
    nombreRazonSocial?: string;
    ruc?: string;
    direccion?: string;
    ciudad?: string;
    barrio?: string;
    telefono?: string;
    celular?: string;
    correo?: string;
    nombreContacto?: string;
    origen?: string;
    estado?: string;
    cliente?: { id: number };
    asignadoPorId?: number;
    fechaEstimadaCierre?: string;
    notas?: string;
    activo?: boolean;
}

export interface ClienteFromConversion {
    id: number;
    razonSocial?: string;
    [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class ProspectoService {
    private path = '/prospectos';

    constructor(private api: ApiService) {}

    list(): Observable<Prospecto[]> {
        return this.api.get<Prospecto[]>(this.path);
    }

    listActivos(): Observable<Prospecto[]> {
        return this.api.get<Prospecto[]>(`${this.path}/activos`);
    }

    listPorEstado(estado: string): Observable<Prospecto[]> {
        return this.api.get<Prospecto[]>(`${this.path}/por-estado`, { estado });
    }

    getById(id: number): Observable<Prospecto> {
        return this.api.get<Prospecto>(`${this.path}/${id}`);
    }

    create(item: Prospecto): Observable<void> {
        return this.api.post<void>(this.path, item);
    }

    update(item: Prospecto): Observable<void> {
        return this.api.put<void>(this.path, item);
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }

    convertirACliente(id: number): Observable<ClienteFromConversion> {
        return this.api.post<ClienteFromConversion>(`${this.path}/${id}/convertir-a-cliente`, {});
    }
}
