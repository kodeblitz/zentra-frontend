import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ComandaService } from '../service/comanda.service';
import { PedidoService, Pedido } from '../service/pedido.service';
import { ClienteService } from '../service/cliente.service';

const ESTADOS = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Confirmado', value: 'CONFIRMADO' },
    { label: 'En preparación', value: 'EN_PREPARACION' },
    { label: 'En entrega', value: 'EN_ENTREGA' },
    { label: 'Entregado', value: 'ENTREGADO' },
    { label: 'Cancelado', value: 'CANCELADO' }
];

@Component({
    selector: 'app-comandas',
    standalone: true,
    imports: [CommonModule, TabsModule, CardModule, ButtonModule, TagModule, ToastModule, TooltipModule],
    templateUrl: './comandas.component.html',
    styleUrls: ['./comandas.component.scss'],
    providers: [MessageService]
})
export class ComandasComponent implements OnInit {
    mesas = signal<Pedido[]>([]);
    delivery = signal<Pedido[]>([]);
    loading = signal(false);
    clienteNombreCache: Record<number, string> = {};
    estadosOpt = ESTADOS;
    activeTab = 0;

    constructor(
        private comandaService: ComandaService,
        private pedidoService: PedidoService,
        private clienteService: ClienteService,
        private messageService: MessageService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.comandaService.listarMesas().subscribe({
            next: (list) => {
                this.mesas.set(list ?? []);
                this.cacheClienteNombres(list ?? []);
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar mesas.' });
                this.loading.set(false);
            }
        });
        this.comandaService.listarDelivery().subscribe({
            next: (list) => {
                this.delivery.set(list ?? []);
                this.cacheClienteNombres(list ?? []);
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar delivery.' })
        });
    }

    private cacheClienteNombres(list: Pedido[]): void {
        list.forEach((p) => {
            const cliente = p.cliente as unknown as { id?: number; razonSocial?: string };
            if (cliente?.id && cliente.razonSocial) this.clienteNombreCache[cliente.id] = cliente.razonSocial;
        });
    }

    getClienteNombre(id: number | undefined): string {
        if (id == null) return '-';
        return this.clienteNombreCache[id] ?? String(id);
    }

    getEstadoLabel(estado: string | undefined): string {
        return ESTADOS.find((x) => x.value === estado)?.label ?? estado ?? '-';
    }

    getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (estado) {
            case 'ENTREGADO':
                return 'success';
            case 'CANCELADO':
                return 'danger';
            case 'EN_ENTREGA':
            case 'EN_PREPARACION':
                return 'info';
            case 'CONFIRMADO':
                return 'warn';
            default:
                return 'secondary';
        }
    }

    getTipoLabel(tipo: string | undefined): string {
        switch (tipo) {
            case 'IN_SITU':
                return 'In situ';
            case 'DELIVERY':
                return 'Delivery';
            case 'RETIRO':
                return 'Retiro';
            default:
                return tipo ?? '-';
        }
    }

    /** Extrae número de mesa de observaciones si existe (ej. "Mesa 5" o "mesa: 5"). */
    getMesaLabel(p: Pedido): string {
        const obs = (p.observaciones ?? '').trim();
        const match = obs.match(/(?:mesa|mesa:)\s*(\d+)/i);
        if (match) return `Mesa ${match[1]}`;
        return p.numero ?? `#${p.id}`;
    }

    confirmar(p: Pedido): void {
        if (!p.id) return;
        this.pedidoService.confirmar(p.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Confirmado', detail: 'Comanda confirmada.' });
                this.load();
            },
            error: (e) =>
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: e?.error?.message ?? 'No se pudo confirmar.'
                })
        });
    }

    enPreparacion(p: Pedido): void {
        if (!p.id) return;
        this.pedidoService.marcarEnPreparacion(p.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'En preparación', detail: 'Comanda en cocina.' });
                this.load();
            },
            error: (e) =>
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: e?.error?.message ?? 'No se pudo actualizar.'
                })
        });
    }

    enEntrega(p: Pedido): void {
        if (!p.id) return;
        this.pedidoService.marcarEnEntrega(p.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'En entrega', detail: 'Comanda en camino.' });
                this.load();
            },
            error: (e) =>
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: e?.error?.message ?? 'No se pudo actualizar.'
                })
        });
    }

    entregado(p: Pedido): void {
        if (!p.id) return;
        this.pedidoService.marcarEntregado(p.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Entregado', detail: 'Comanda finalizada.' });
                this.load();
            },
            error: (e) =>
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: e?.error?.message ?? 'No se pudo actualizar.'
                })
        });
    }

    cancelar(p: Pedido): void {
        if (!p.id) return;
        this.pedidoService.cancelar(p.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Cancelado', detail: 'Comanda cancelada.' });
                this.load();
            },
            error: (e) =>
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: e?.error?.message ?? 'No se pudo cancelar.'
                })
        });
    }

    facturar(p: Pedido): void {
        if (!p.id) return;
        this.pedidoService.facturar(p.id).subscribe({
            next: (doc) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Facturado',
                    detail: `Factura ${doc.numeroCompleto ?? doc.numero ?? doc.id} emitida.`
                });
                this.load();
            },
            error: (e) =>
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: e?.error?.message ?? 'No se pudo facturar.'
                })
        });
    }

    irAPdv(): void {
        this.router.navigate(['/pages/pdv']);
    }

    irAPedidos(): void {
        this.router.navigate(['/pages/pedidos']);
    }
}
