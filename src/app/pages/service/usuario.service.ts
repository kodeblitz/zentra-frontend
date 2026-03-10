import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface UsuarioDTO {
    id: number;
    username: string;
    nombre?: string;
    email?: string;
    activo?: boolean;
    roles?: string[];
}

export interface RoleInfo {
    codigo: string;
    nombre: string;
    descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
    constructor(private api: ApiService) {}

    listar(): Observable<UsuarioDTO[]> {
        return this.api.get<UsuarioDTO[]>('/usuarios');
    }

    obtener(id: number): Observable<UsuarioDTO> {
        return this.api.get<UsuarioDTO>(`/usuarios/${id}`);
    }

    rolesDisponibles(): Observable<RoleInfo[]> {
        return this.api.get<RoleInfo[]>('/usuarios/roles');
    }

    crear(body: { username: string; password: string; nombre?: string; email?: string; roles?: string[] }): Observable<UsuarioDTO> {
        return this.api.post<UsuarioDTO>('/usuarios', body);
    }

    actualizar(id: number, body: Partial<{ nombre: string; email: string; activo: boolean; roles: string[]; password: string }>): Observable<UsuarioDTO> {
        return this.api.put<UsuarioDTO>(`/usuarios/${id}`, body);
    }
}
