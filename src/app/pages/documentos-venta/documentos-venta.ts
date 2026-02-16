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
import { MessageService, ConfirmationService } from 'primeng/api';
import { DocumentoVentaService, DocumentoVenta, DocumentoVentaDetalle } from '../service/documento-venta.service';
import { ClienteService } from '../service/cliente.service';
import { Cliente } from '../service/cliente.service';
import { MaestrosService, Empresa, TipoDocumento, Moneda, CondicionPago, Producto } from '../service/maestros.service';

@Component({
    selector: 'app-documentos-venta',
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
    templateUrl: './documentos-venta.component.html',
    styleUrls: ['./documentos-venta.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class DocumentosVentaComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    documentos = signal<DocumentoVenta[]>([]);
    clientesSugeridos: Cliente[] = [];
    productosSugeridos: Producto[] = [];
    clienteNombreCache: Record<number, string> = {};
    productoCache: Record<number, Producto> = {};
    empresas: Empresa[] = [];
    tiposDocumento: TipoDocumento[] = [];
    monedas: Moneda[] = [];
    condicionesPago: CondicionPago[] = [];
    selectedCliente: Cliente | null = null;
    dialog = false;
    editing = false;
    doc: DocumentoVenta = {};
    loading = signal(false);

    constructor(
        private docService: DocumentoVentaService,
        private clienteService: ClienteService,
        private maestros: MaestrosService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.load();
        this.maestros.empresas().subscribe((e) => (this.empresas = e ?? []));
        this.maestros.tiposDocumento().subscribe((t) => (this.tiposDocumento = t ?? []));
        this.maestros.monedas().subscribe((m) => (this.monedas = m ?? []));
        this.maestros.condicionesPago().subscribe((c) => (this.condicionesPago = c ?? []));
    }

    buscarClientes(event: AutoCompleteCompleteEvent): void {
        this.clienteService.buscar(event.query, 20).subscribe((r) => (this.clientesSugeridos = r ?? []));
    }

    buscarProductos(event: AutoCompleteCompleteEvent): void {
        this.maestros.productosBuscar(event.query, 20).subscribe((r) => (this.productosSugeridos = r ?? []));
    }

    load(): void {
        this.loading.set(true);
        this.docService.list().subscribe({
            next: (list) => {
                const items = list ?? [];
                this.documentos.set(items);
                items.forEach((d) => {
                    const cliente = d.cliente as unknown as { id?: number; razonSocial?: string };
                    if (cliente?.id != null && cliente.razonSocial != null)
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

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    getClienteNombre(id: number | undefined): string {
        if (id == null) return '-';
        return this.clienteNombreCache[id] ?? String(id);
    }

    getProductoForLine(line: DocumentoVentaDetalle): Producto | null {
        if (!line.producto?.id) return null;
        return this.productoCache[line.producto.id] ?? null;
    }

    onClienteSelect(): void {
        if (this.selectedCliente?.id) {
            this.doc.cliente = { id: this.selectedCliente.id };
            this.clienteNombreCache[this.selectedCliente.id] = this.selectedCliente.razonSocial ?? '';
        }
    }

    onProductoSelect(line: DocumentoVentaDetalle, p: Producto | null): void {
        if (!p || p.id == null) {
            line.producto = undefined;
            return;
        }
        this.productoCache[p.id] = p;
        line.producto = { id: p.id };
        line.precioUnitario = p.precioVenta ?? 0;
        line.ivaPorcentaje = p.ivaPorcentaje ?? 0;
        this.recalcLine(line);
    }

    openNew(): void {
        this.doc = {
            fechaEmision: new Date().toISOString().slice(0, 10),
            estado: 'BORRADOR',
            detalle: []
        };
        this.selectedCliente = null;
        this.editing = false;
        this.dialog = true;
    }

    edit(row: DocumentoVenta): void {
        if (row.estado !== 'BORRADOR') {
            this.messageService.add({ severity: 'warn', summary: 'Solo borradores', detail: 'Solo se pueden editar documentos en BORRADOR.' });
            return;
        }
        this.docService.getById(row.id!).subscribe({
            next: (d) => {
                this.doc = { ...d };
                this.doc.detalle = d.detalle ? [...d.detalle] : [];
                this.selectedCliente = null;
                const clienteId = this.doc.cliente?.id;
                if (clienteId) {
                    this.clienteService.getById(clienteId).subscribe({
                        next: (c) => {
                            this.selectedCliente = c;
                            this.clienteNombreCache[c.id!] = c.razonSocial ?? '';
                        }
                    });
                }
                (this.doc.detalle ?? []).forEach((line) => {
                    if (line.producto?.id && !this.productoCache[line.producto.id])
                        this.maestros.getProductoById(line.producto.id).subscribe((prod) => {
                            if (prod.id != null) this.productoCache[prod.id] = prod;
                        });
                });
                this.editing = true;
                this.dialog = true;
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el documento.' })
        });
    }

    addLine(): void {
        if (!this.doc.detalle) this.doc.detalle = [];
        const nro = this.doc.detalle.length + 1;
        this.doc.detalle.push({ nroLinea: nro, cantidad: 1, precioUnitario: 0, descuento: 0, subtotal: 0, totalLinea: 0 });
    }

    removeLine(line: DocumentoVentaDetalle): void {
        this.doc.detalle = (this.doc.detalle ?? []).filter((l) => l !== line);
        this.recalcTotales();
    }


    /** Precios de productos son IVA incluido: total línea = cantidad × precio (ya con IVA); base y IVA se desglosan. */
    recalcLine(line: DocumentoVentaDetalle): void {
        const q = line.cantidad ?? 0;
        const pu = line.precioUnitario ?? 0;
        const desc = (line.descuento ?? 0) / 100;
        const ivaPct = (line.ivaPorcentaje ?? 0) / 100;
        line.totalLinea = q * pu * (1 - desc);
        if (ivaPct <= 0) {
            line.subtotal = line.totalLinea;
            line.ivaMonto = 0;
        } else {
            line.subtotal = line.totalLinea / (1 + ivaPct);
            line.ivaMonto = line.totalLinea - (line.subtotal ?? 0);
        }
        this.recalcTotales();
    }

    recalcTotales(): void {
        const det = this.doc.detalle ?? [];
        this.doc.subtotal = det.reduce((s, l) => s + (l.subtotal ?? 0), 0);
        this.doc.totalIva = det.reduce((s, l) => s + (l.ivaMonto ?? 0), 0);
        this.doc.descuentoTotal = 0;
        this.doc.total = (this.doc.subtotal ?? 0) + (this.doc.totalIva ?? 0);
    }

    hideDialog(): void {
        this.dialog = false;
        this.doc = {};
    }

    onDialogHide(): void {
        this.doc = {};
        this.selectedCliente = null;
    }

    save(): void {
        if (!this.doc.cliente?.id) {
            this.messageService.add({ severity: 'warn', summary: 'Cliente requerido', detail: 'Seleccione un cliente.' });
            return;
        }
        const payload: DocumentoVenta = {
            ...this.doc,
            empresa: this.doc.empresa?.id ? { id: this.doc.empresa.id } : undefined,
            cliente: { id: this.doc.cliente.id },
            tipoDocumento: this.doc.tipoDocumento?.id ? { id: this.doc.tipoDocumento.id } : undefined,
            moneda: this.doc.moneda?.id ? { id: this.doc.moneda.id } : undefined,
            condicionPago: this.doc.condicionPago?.id ? { id: this.doc.condicionPago.id } : undefined,
            detalle: (this.doc.detalle ?? []).map((l) => ({
                ...l,
                producto: l.producto?.id ? { id: l.producto.id } : undefined
            }))
        };
        const req = this.editing && this.doc.id ? this.docService.update(payload) : this.docService.create(payload);
        req.subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: this.editing ? 'Documento actualizado.' : 'Documento creado.' });
                this.hideDialog();
                this.load();
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar.' })
        });
    }

    emitir(row: DocumentoVenta): void {
        this.confirmationService.confirm({
            message: '¿Emitir este documento?',
            header: 'Confirmar',
            icon: 'pi pi-send',
            accept: () => {
                this.docService.emitir(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Emitido', detail: 'Documento emitido.' });
                        this.load();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo emitir.' })
                });
            }
        });
    }

    anular(row: DocumentoVenta): void {
        this.confirmationService.confirm({
            message: '¿Anular este documento?',
            header: 'Confirmar',
            icon: 'pi pi-times',
            accept: () => {
                this.docService.anular(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Anulado', detail: 'Documento anulado.' });
                        this.load();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo anular.' })
                });
            }
        });
    }
}
