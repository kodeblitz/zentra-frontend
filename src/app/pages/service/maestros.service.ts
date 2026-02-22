import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface CondicionPago {
    id: number;
    codigo?: string;
    nombre?: string;
    dias?: number;
}

export interface TipoDocumento {
    id: number;
    codigoSet?: string;
    nombre?: string;
}

export interface Moneda {
    id: number;
    codigo?: string;
    nombre?: string;
    simbolo?: string;
}

export interface Empresa {
    id: number;
    razonSocial?: string;
    ruc?: string;
    /** Establecimiento por defecto para facturación (Paraguay: ej. 001). */
    establecimientoDefault?: string;
    /** Punto de expedición por defecto (Paraguay: ej. 001). */
    puntoEmisionDefault?: string;
    /** Sucursal por defecto al facturar (usa su establecimiento y punto de expedición). null para limpiar. */
    sucursalDefault?: { id: number } | null;
}

/** Sucursal de la empresa (establecimiento y punto de expedición para facturación). */
export interface Sucursal {
    id?: number;
    empresa?: { id: number };
    codigo?: string;
    nombre?: string;
    establecimiento?: string;
    puntoEmision?: string;
    direccion?: string;
    activo?: boolean;
}

/** Timbrado para facturación física Paraguay (vigencia). */
export interface Timbrado {
    id?: number;
    empresa?: { id: number };
    numeroTimbrado?: string;
    fechaInicioVigencia?: string;
    fechaFinVigencia?: string;
    activo?: boolean;
}

export interface MedioPago {
    id: number;
    codigo?: string;
    nombre?: string;
}

export interface Categoria {
    id: number;
    codigo?: string;
    nombre?: string;
}

export interface UnidadMedida {
    id: number;
    codigo?: string;
    nombre?: string;
}

/** Rangos de cantidad para precios mayoristas (desde N unidades). */
export const MAYORISTA_RANGOS = [5, 10, 20, 50, 100] as const;

export interface Producto {
    id?: number;
    codigo?: string;
    /** Código escaneable (barras/QR). Usado en visor de precios. */
    codigoBarras?: string;
    nombre?: string;
    descripcion?: string;
    precioVenta?: number;
    precioMayorista?: number;
    /** Precio unitario desde 5 unidades */
    precioMayorista5?: number;
    precioMayorista10?: number;
    precioMayorista20?: number;
    precioMayorista50?: number;
    precioMayorista100?: number;
    costo?: number;
    ivaPorcentaje?: number;
    categoria?: Categoria;
    unidadMedida?: UnidadMedida;
    activo?: boolean;
    esCombo?: boolean;
    alquilable?: boolean;
    precioAlquilerDia?: number;
}

/**
 * Devuelve el precio mayorista para una cantidad según rangos 5,10,20,50,100.
 * Usa el mayor rango con desde <= cantidad; si cantidad < 5 devuelve el precio del rango 5 para mostrar.
 */
export function precioMayoristaParaCantidad(p: Producto, cantidad: number): number | null {
    const candidatos: { desde: number; precio: number }[] = [
        { desde: 5, precio: p.precioMayorista5 ?? 0 },
        { desde: 10, precio: p.precioMayorista10 ?? 0 },
        { desde: 20, precio: p.precioMayorista20 ?? 0 },
        { desde: 50, precio: p.precioMayorista50 ?? 0 },
        { desde: 100, precio: p.precioMayorista100 ?? 0 }
    ].filter((x) => x.precio > 0);
    if (candidatos.length === 0) return p.precioMayorista ?? p.precioVenta ?? null;
    const q = Math.max(1, cantidad);
    const elegido = candidatos.filter((c) => c.desde <= q).sort((a, b) => b.desde - a.desde)[0] ?? candidatos[0];
    return elegido.precio;
}

@Injectable({ providedIn: 'root' })
export class MaestrosService {
    constructor(private api: ApiService) {}

    condicionesPago(): Observable<CondicionPago[]> {
        return this.api.get<CondicionPago[]>('/condiciones-pago');
    }

    tiposDocumento(): Observable<TipoDocumento[]> {
        return this.api.get<TipoDocumento[]>('/tipos-documento');
    }

    monedas(): Observable<Moneda[]> {
        return this.api.get<Moneda[]>('/monedas');
    }

    empresas(): Observable<Empresa[]> {
        return this.api.get<Empresa[]>('/empresas');
    }

    updateEmpresa(id: number, body: Partial<Empresa>): Observable<void> {
        return this.api.put<void>(`/empresas/${id}`, body);
    }

    sucursales(empresaId?: number): Observable<Sucursal[]> {
        const params = empresaId != null ? { empresaId } : undefined;
        return this.api.get<Sucursal[]>('/sucursales', params);
    }

    createSucursal(s: Sucursal): Observable<Sucursal> {
        return this.api.post<Sucursal>('/sucursales', s);
    }

    updateSucursal(id: number, s: Partial<Sucursal>): Observable<void> {
        return this.api.put<void>(`/sucursales/${id}`, s);
    }

    deleteSucursal(id: number): Observable<boolean> {
        return this.api.delete(`/sucursales/${id}`);
    }

    timbrados(empresaId?: number): Observable<Timbrado[]> {
        const params = empresaId != null ? { empresaId } : undefined;
        return this.api.get<Timbrado[]>('/timbrados', params);
    }

    createTimbrado(t: Timbrado): Observable<Timbrado> {
        return this.api.post<Timbrado>('/timbrados', t);
    }

    updateTimbrado(id: number, t: Partial<Timbrado>): Observable<void> {
        return this.api.put<void>(`/timbrados/${id}`, t);
    }

    deleteTimbrado(id: number): Observable<boolean> {
        return this.api.delete(`/timbrados/${id}`);
    }

    mediosPago(): Observable<MedioPago[]> {
        return this.api.get<MedioPago[]>('/medios-pago/activos');
    }

    productos(): Observable<Producto[]> {
        return this.api.get<Producto[]>('/productos');
    }

    getProductoById(id: number): Observable<Producto> {
        return this.api.get<Producto>(`/productos/${id}`);
    }

    /** Búsqueda de productos para autocompletado (mín. 2 caracteres). Escalable para muchos productos. */
    productosBuscar(q: string, limit = 20): Observable<Producto[]> {
        const term = (q ?? '').trim();
        if (term.length < 2) return of([]);
        return this.api.get<Producto[]>('/productos/buscar', { q: term, limit });
    }

    categorias(): Observable<Categoria[]> {
        return this.api.get<Categoria[]>('/categorias');
    }

    unidadesMedida(): Observable<UnidadMedida[]> {
        return this.api.get<UnidadMedida[]>('/unidades-medida');
    }

    /** Todos los medios de pago (para pantalla paramétricos). */
    mediosPagoTodos(): Observable<MedioPago[]> {
        return this.api.get<MedioPago[]>('/medios-pago');
    }

    /**
     * Precio unitario (y total sugerido) para una cantidad.
     * Si el producto tiene precios por cantidad (ej. 1→2000, 3 por 5000) devuelve el que corresponda; si no, precio_venta.
     */
    getPrecioParaCantidad(productoId: number, cantidad: number): Observable<{ precioUnitario: number; totalSugerido: number }> {
        const q = Math.max(1, cantidad);
        return this.api.get<{ precioUnitario: number; totalSugerido: number }>(`/productos/${productoId}/precio-para-cantidad`, { cantidad: q });
    }
}
