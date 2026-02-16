import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Producto } from './maestros.service';

@Injectable({ providedIn: 'root' })
export class ProductoService {
    private path = '/productos';

    constructor(private api: ApiService) {}

    list(): Observable<Producto[]> {
        return this.api.get<Producto[]>(this.path);
    }

    getById(id: number): Observable<Producto> {
        return this.api.get<Producto>(`${this.path}/${id}`);
    }

    create(item: Producto): Observable<void> {
        return this.api.post<void>(this.path, this.toPayload(item));
    }

    update(item: Producto): Observable<void> {
        return this.api.put<void>(this.path, this.toPayload(item));
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }

    private toPayload(p: Producto): Record<string, unknown> {
        return {
            id: p.id,
            codigo: p.codigo?.trim() || null,
            nombre: p.nombre?.trim() || null,
            descripcion: p.descripcion?.trim() || null,
            precioVenta: p.precioVenta ?? 0,
            precioMayorista: p.precioMayorista ?? null,
            precioMayorista5: p.precioMayorista5 ?? null,
            precioMayorista10: p.precioMayorista10 ?? null,
            precioMayorista20: p.precioMayorista20 ?? null,
            precioMayorista50: p.precioMayorista50 ?? null,
            precioMayorista100: p.precioMayorista100 ?? null,
            costo: p.costo ?? null,
            ivaPorcentaje: p.ivaPorcentaje ?? 10,
            categoria: p.categoria?.id != null ? { id: p.categoria.id } : null,
            unidadMedida: p.unidadMedida?.id != null ? { id: p.unidadMedida.id } : null,
            activo: p.activo !== false,
            esCombo: p.esCombo === true,
            alquilable: p.alquilable === true,
            precioAlquilerDia: p.alquilable ? (p.precioAlquilerDia ?? null) : null
        };
    }
}
