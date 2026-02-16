import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Producto } from './maestros.service';

export interface ProductoComboDetalle {
    id?: number;
    productoCombo?: { id: number };
    producto?: Producto | { id: number };
    cantidad?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductoComboDetalleService {
    private path = '/productos-combo-detalle';

    constructor(private api: ApiService) {}

    listByCombo(productoComboId: number): Observable<ProductoComboDetalle[]> {
        return this.api.get<ProductoComboDetalle[]>(`${this.path}/por-combo/${productoComboId}`);
    }

    create(item: ProductoComboDetalle): Observable<void> {
        return this.api.post<void>(this.path, {
            productoCombo: item.productoCombo,
            producto: typeof item.producto === 'object' && item.producto !== null && 'id' in item.producto ? { id: (item.producto as { id: number }).id } : undefined,
            cantidad: item.cantidad ?? 1
        });
    }

    update(item: ProductoComboDetalle): Observable<void> {
        if (item.id == null) throw new Error('id requerido para actualizar');
        return this.api.put<void>(this.path, {
            id: item.id,
            productoCombo: item.productoCombo,
            producto: typeof item.producto === 'object' && item.producto !== null && 'id' in item.producto ? { id: (item.producto as { id: number }).id } : undefined,
            cantidad: item.cantidad ?? 1
        });
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }
}
