import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface PedidoDetalle {
    id?: number;
    nroLinea?: number;
    producto?: { id: number };
    descripcion?: string;
    cantidad?: number;
    precioUnitario?: number;
    /** Descuento % sobre (cantidad × precio unitario). */
    descuento?: number;
    /** Descuento en monto fijo (Gs). Promos espontáneas en PDV. */
    descuentoMonto?: number;
    totalLinea?: number;
}

export interface Pedido {
    id?: number;
    cliente?: { id: number };
    numero?: string;
    fechaPedido?: string;
    fechaEntregaEstimada?: string;
    estado?: string;
    tipoPedido?: string;
    direccionEntrega?: string;
    telefonoContacto?: string;
    observaciones?: string;
    /** Forma de pago indicada en PDV: TRANSFERENCIA o QR (TD 0 TC). */
    formaPago?: string;
    /** Nº referencia del voucher de la procesadora (obligatorio cuando formaPago = QR). Para validación en caja. */
    referenciaVoucher?: string;
    subtotal?: number;
    total?: number;
    moneda?: { id: number };
    detalle?: PedidoDetalle[];
    /** Factura (documento de venta) asociada cuando se factura el pedido. */
    documentoVenta?: { id: number; numero?: string; estado?: string };
    /** Timestamp de creación (ISO). Para mostrar hora real en listados. */
    creadoEn?: string;
}

@Injectable({ providedIn: 'root' })
export class PedidoService {
    private path = '/pedidos';

    constructor(private api: ApiService) {}

    list(): Observable<Pedido[]> {
        return this.api.get<Pedido[]>(this.path);
    }

    /** Lista paginada (para dashboard: últimos pedidos con sortBy=fechaPedido, sortDir=desc). */
    paginate(params: { page?: number; size?: number; sortBy?: string; sortDir?: string }): Observable<{ content: Pedido[]; totalElements: number; totalPages: number }> {
        const { page = 0, size = 10, sortBy, sortDir } = params;
        const p: Record<string, string | number> = { page: String(page), size: String(size) };
        if (sortBy) p['sortBy'] = sortBy;
        if (sortDir) p['sortDir'] = sortDir;
        return this.api.get<{ content: Pedido[]; totalElements: number; totalPages: number }>(`${this.path}/paginate`, p as Record<string, string>);
    }

    listPorCliente(clienteId: number): Observable<Pedido[]> {
        return this.api.get<Pedido[]>(`${this.path}/por-cliente/${clienteId}`);
    }

    listPorEstado(estado: string): Observable<Pedido[]> {
        return this.api.get<Pedido[]>(`${this.path}/por-estado`, { estado });
    }

    getById(id: number): Observable<Pedido> {
        return this.api.get<Pedido>(`${this.path}/${id}`);
    }

    create(item: Pedido): Observable<Pedido> {
        return this.api.post<Pedido>(this.path, item);
    }

    update(item: Pedido): Observable<void> {
        return this.api.put<void>(this.path, item);
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }

    confirmar(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/confirmar`, {});
    }

    marcarEnPreparacion(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/en-preparacion`, {});
    }

    marcarEnEntrega(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/en-entrega`, {});
    }

    marcarEntregado(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/entregado`, {});
    }

    cancelar(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/cancelar`, {});
    }

    /** Genera una factura a partir del pedido y la asocia. Devuelve el documento de venta creado. */
    facturar(id: number): Observable<{ id: number; numero?: string; numeroCompleto?: string; estado?: string }> {
        return this.api.post<{ id: number; numero?: string; numeroCompleto?: string; estado?: string }>(`${this.path}/${id}/facturar`, {});
    }
}
