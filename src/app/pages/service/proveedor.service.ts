import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface Proveedor {
    id?: number;
    codigo?: string;
    razonSocial?: string;
    ruc?: string;
    direccion?: string;
    telefono?: string;
    celular?: string;
    correo?: string;
    contacto?: string;
    observaciones?: string;
    activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProveedorService {
    private path = '/proveedores';

    constructor(private api: ApiService) {}

    list(): Observable<Proveedor[]> {
        return this.api.get<Proveedor[]>(this.path);
    }

    listActivos(): Observable<Proveedor[]> {
        return this.api.get<Proveedor[]>(`${this.path}/activos`);
    }

    getById(id: number): Observable<Proveedor> {
        return this.api.get<Proveedor>(`${this.path}/${id}`);
    }

    create(item: Proveedor): Observable<void> {
        return this.api.post<void>(this.path, item);
    }

    update(item: Proveedor): Observable<void> {
        return this.api.put<void>(this.path, item);
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }
}
