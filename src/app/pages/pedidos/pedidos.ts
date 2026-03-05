import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { Observable } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PedidoService, Pedido, PedidoDetalle } from '../service/pedido.service';
import { ClienteService, Cliente } from '../service/cliente.service';
import { MaestrosService, Producto, Moneda } from '../service/maestros.service';

const ESTADOS = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Confirmado', value: 'CONFIRMADO' },
    { label: 'En preparación', value: 'EN_PREPARACION' },
    { label: 'En entrega', value: 'EN_ENTREGA' },
    { label: 'Entregado', value: 'ENTREGADO' },
    { label: 'Cancelado', value: 'CANCELADO' }
];

@Component({
    selector: 'app-pedidos',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        DialogModule,
        AutoCompleteModule,
        SelectModule,
        InputNumberModule,
        ToastModule,
        ToolbarModule,
        ConfirmDialogModule,
        IconFieldModule,
        InputIconModule,
        TagModule
    ],
    templateUrl: './pedidos.component.html',
    styleUrls: ['./pedidos.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class PedidosComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    pedidos = signal<Pedido[]>([]);
    clientesSugeridos: Cliente[] = [];
    productosSugeridos: Producto[] = [];
    selectedCliente: Cliente | null = null;
    clienteNombreCache: Record<number, string> = {};
    productoCache: Record<number, Producto> = {};
    productos: Producto[] = [];
    monedas: Moneda[] = [];
    estadosOpt = ESTADOS;
    filterEstado: string | null = null;
    dialog = false;
    editing = false;
    pedido: Pedido = {};
    loading = signal(false);

    constructor(
        private pedidoService: PedidoService,
        private clienteService: ClienteService,
        private maestros: MaestrosService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.load();
        this.maestros.monedas().subscribe((m) => (this.monedas = m ?? []));
    }

    buscarClientes(event: AutoCompleteCompleteEvent): void {
        this.clienteService.buscar(event.query, 20).subscribe((r) => (this.clientesSugeridos = r ?? []));
    }

    buscarProductos(event: AutoCompleteCompleteEvent): void {
        this.maestros.productosBuscar(event.query, 20).subscribe((r) => (this.productosSugeridos = r ?? []));
    }

    load(): void {
        this.loading.set(true);
        const req = this.filterEstado
            ? this.pedidoService.listPorEstado(this.filterEstado)
            : this.pedidoService.list();
        req.subscribe({
            next: (list) => {
                const items = list ?? [];
                this.pedidos.set(items);
                items.forEach((p) => {
                    const cliente = p.cliente as unknown as { id?: number; razonSocial?: string };
                    if (cliente?.id && cliente.razonSocial)
                        this.clienteNombreCache[cliente.id] = cliente.razonSocial;
                });
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar.' });
                this.loading.set(false);
            }
        });
    }

    onClienteSelect(): void {
        if (this.selectedCliente?.id) {
            if (this.selectedCliente?.id) this.pedido.cliente = { id: this.selectedCliente.id };
            this.clienteNombreCache[this.selectedCliente.id] = this.selectedCliente.razonSocial ?? '';
        }
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    getClienteNombre(id: number | undefined): string {
        if (id == null) return '-';
        return this.clienteNombreCache[id] ?? String(id);
    }

    getEstadoLabel(estado: string | undefined): string {
        const e = ESTADOS.find((x) => x.value === estado);
        return e?.label ?? estado ?? '-';
    }

    getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (estado) {
            case 'ENTREGADO': return 'success';
            case 'CANCELADO': return 'danger';
            case 'EN_ENTREGA': return 'info';
            case 'EN_PREPARACION': return 'info';
            case 'CONFIRMADO': return 'warn';
            default: return 'secondary';
        }
    }

    getProductoForLine(line: PedidoDetalle): Producto | null {
        if (!line.producto?.id) return null;
        return this.productoCache[line.producto.id] ?? null;
    }

    openNew(): void {
        this.pedido = {
            fechaPedido: new Date().toISOString().slice(0, 10),
            estado: 'PENDIENTE',
            detalle: []
        };
        this.selectedCliente = null;
        this.editing = false;
        this.dialog = true;
    }

    edit(row: Pedido): void {
        if (row.estado !== 'PENDIENTE') {
            this.messageService.add({ severity: 'warn', summary: 'Solo pendientes', detail: 'Solo se pueden editar pedidos en estado PENDIENTE.' });
            return;
        }
        this.pedidoService.getById(row.id!).subscribe({
            next: (p) => {
                this.pedido = { ...p };
                this.pedido.detalle = p.detalle ? [...p.detalle] : [];
                this.selectedCliente = null;
                const clienteId = this.pedido.cliente?.id;
                if (clienteId) {
                    this.clienteService.getById(clienteId).subscribe({
                        next: (c) => {
                            this.selectedCliente = c;
                            this.clienteNombreCache[c.id!] = c.razonSocial ?? '';
                        }
                    });
                }
                (this.pedido.detalle ?? []).forEach((line) => {
                    if (line.producto?.id && !this.productoCache[line.producto.id])
                        this.maestros.getProductoById(line.producto.id).subscribe((prod) => {
                            if (prod.id != null) this.productoCache[prod.id] = prod;
                        });
                });
                this.editing = true;
                this.dialog = true;
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el pedido.' })
        });
    }

    addLine(): void {
        if (!this.pedido.detalle) this.pedido.detalle = [];
        const nro = this.pedido.detalle.length + 1;
        this.pedido.detalle.push({ nroLinea: nro, cantidad: 1, precioUnitario: 0, totalLinea: 0 });
    }

    removeLine(line: PedidoDetalle): void {
        this.pedido.detalle = (this.pedido.detalle ?? []).filter((l) => l !== line);
        this.recalcTotales();
    }

    onProductoSelect(line: PedidoDetalle, p: Producto | null): void {
        if (!p || p.id == null) {
            line.producto = undefined;
            return;
        }
        this.productoCache[p.id] = p;
        line.producto = { id: p.id };
        line.precioUnitario = p.precioVenta ?? 0;
        this.recalcLine(line);
    }

    recalcLine(line: PedidoDetalle): void {
        const q = line.cantidad ?? 0;
        const pu = line.precioUnitario ?? 0;
        line.totalLinea = q * pu;
        this.recalcTotales();
    }

    recalcTotales(): void {
        const det = this.pedido.detalle ?? [];
        this.pedido.subtotal = det.reduce((s, l) => s + (l.totalLinea ?? 0), 0);
        this.pedido.total = this.pedido.subtotal ?? 0;
    }

    hideDialog(): void {
        this.dialog = false;
        this.pedido = {};
    }

    onDialogHide(): void {
        this.pedido = {};
        this.selectedCliente = null;
    }

    save(): void {
        if (!this.pedido.cliente?.id) {
            this.messageService.add({ severity: 'warn', summary: 'Cliente requerido', detail: 'Seleccione un cliente.' });
            return;
        }
        const payload: Pedido = {
            ...this.pedido,
            cliente: { id: this.pedido.cliente.id },
            moneda: this.pedido.moneda?.id ? { id: this.pedido.moneda.id } : undefined,
            detalle: (this.pedido.detalle ?? []).map((l) => ({
                ...l,
                producto: l.producto?.id ? { id: l.producto.id } : undefined
            }))
        };
        if (this.editing && this.pedido.id) {
            this.pedidoService.update(payload).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Pedido actualizado.' });
                    this.hideDialog();
                    this.load();
                },
                error: (err: unknown) => this.messageService.add({ severity: 'error', summary: 'Error', detail: (err as { error?: { message?: string } })?.error?.message || 'Error al guardar.' })
            });
        } else {
            this.pedidoService.create(payload).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Pedido creado.' });
                    this.hideDialog();
                    this.load();
                },
                error: (err: unknown) => this.messageService.add({ severity: 'error', summary: 'Error', detail: (err as { error?: { message?: string } })?.error?.message || 'Error al guardar.' })
            });
        }
    }

    private accion(nombre: string, row: Pedido, fn: (id: number) => Observable<void>): void {
        this.confirmationService.confirm({
            message: `¿${nombre} este pedido?`,
            header: 'Confirmar',
            icon: 'pi pi-question-circle',
            accept: () => {
                fn(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: nombre, detail: 'Pedido actualizado.' });
                        this.load();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo actualizar.' })
                });
            }
        });
    }

    confirmar(row: Pedido): void {
        this.accion('Confirmar', row, (id) => this.pedidoService.confirmar(id));
    }

    enPreparacion(row: Pedido): void {
        this.accion('Marcar en preparación', row, (id) => this.pedidoService.marcarEnPreparacion(id));
    }

    enEntrega(row: Pedido): void {
        this.accion('Marcar en entrega', row, (id) => this.pedidoService.marcarEnEntrega(id));
    }

    entregado(row: Pedido): void {
        this.accion('Marcar como entregado', row, (id) => this.pedidoService.marcarEntregado(id));
    }

    cancelar(row: Pedido): void {
        this.accion('Cancelar', row, (id) => this.pedidoService.cancelar(id));
    }

    facturar(row: Pedido): void {
        if (!row.id) return;
        this.pedidoService.facturar(row.id).subscribe({
            next: (doc) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Factura creada',
                    detail: doc.numeroCompleto || doc.numero ? `Factura ${doc.numeroCompleto || doc.numero} (borrador). Podés emitirla en Documentos de venta.` : 'Factura creada y asociada al pedido.'
                });
                this.load();
            },
            error: (err) =>
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err?.error?.message || 'No se pudo generar la factura.'
                })
        });
    }
}
