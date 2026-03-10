import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PedidoService, Pedido } from './pedido.service';

/** Estados de comanda activa (no finalizados). */
export const ESTADOS_COMANDA_ACTIVA = ['PENDIENTE', 'CONFIRMADO', 'EN_PREPARACION', 'EN_ENTREGA'] as const;

@Injectable({ providedIn: 'root' })
export class ComandaService {
    constructor(private pedidoService: PedidoService) {}

    /** Lista pedidos de mesas (IN_SITU, RETIRO) que están activos. */
    listarMesas(): Observable<Pedido[]> {
        return this.pedidoService.list().pipe(
            map((list) =>
                list
                    .filter(
                        (p) =>
                            (p.tipoPedido === 'IN_SITU' || p.tipoPedido === 'RETIRO') &&
                            p.estado &&
                            ESTADOS_COMANDA_ACTIVA.includes(p.estado as (typeof ESTADOS_COMANDA_ACTIVA)[number])
                    )
                    .sort((a, b) => {
                        const aDate = a.creadoEn ? new Date(a.creadoEn).getTime() : 0;
                        const bDate = b.creadoEn ? new Date(b.creadoEn).getTime() : 0;
                        return bDate - aDate;
                    })
            )
        );
    }

    /** Lista pedidos de delivery que están activos. */
    listarDelivery(): Observable<Pedido[]> {
        return this.pedidoService.list().pipe(
            map((list) =>
                list
                    .filter(
                        (p) =>
                            p.tipoPedido === 'DELIVERY' &&
                            p.estado &&
                            ESTADOS_COMANDA_ACTIVA.includes(p.estado as (typeof ESTADOS_COMANDA_ACTIVA)[number])
                    )
                    .sort((a, b) => {
                        const aDate = a.creadoEn ? new Date(a.creadoEn).getTime() : 0;
                        const bDate = b.creadoEn ? new Date(b.creadoEn).getTime() : 0;
                        return bDate - aDate;
                    })
            )
        );
    }
}
