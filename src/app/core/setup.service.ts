import { Injectable } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApiService } from './api.service';
import { MaestrosService, Empresa, Sucursal, Timbrado } from '../pages/service/maestros.service';

export interface SetupEstado {
    completo: boolean;
}

@Injectable({ providedIn: 'root' })
export class SetupService {
    private cache: SetupEstado | null = null;

    constructor(
        private api: ApiService,
        private maestros: MaestrosService
    ) {}

    /** Verifica si el setup inicial está completo (al menos una empresa configurada). */
    estaCompleto(): Observable<boolean> {
        return this.api.get<SetupEstado>('/setup/estado').pipe(
            tap((r) => (this.cache = r)),
            map((r) => r.completo === true)
        );
    }

    /** Invalida el caché para forzar nueva verificación. */
    invalidarCache(): void {
        this.cache = null;
    }

    crearEmpresa(e: Partial<Empresa>): Observable<Empresa> {
        return this.maestros.createEmpresa(e).pipe(
            tap(() => this.invalidarCache())
        );
    }

    crearSucursal(s: Sucursal): Observable<Sucursal> {
        return this.maestros.createSucursal(s);
    }

    crearTimbrado(t: Timbrado): Observable<Timbrado> {
        return this.maestros.createTimbrado(t);
    }

    actualizarEmpresa(id: number, body: Partial<Empresa>): Observable<void> {
        return this.maestros.updateEmpresa(id, body).pipe(
            tap(() => this.invalidarCache())
        );
    }
}
