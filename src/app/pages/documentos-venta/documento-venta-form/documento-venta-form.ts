import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { DocumentoVentaService, DocumentoVenta, DocumentoVentaDetalle } from '../../service/documento-venta.service';
import { ClienteService } from '../../service/cliente.service';
import { Cliente } from '../../service/cliente.service';
import { ProductoService } from '../../service/producto.service';
import { MaestrosService, Empresa, TipoDocumento, Moneda, CondicionPago, Producto, UnidadMedida } from '../../service/maestros.service';

@Component({
    selector: 'app-documento-venta-form',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        AutoCompleteModule,
        SelectModule,
        InputNumberModule,
        ToastModule,
        CardModule,
        DialogModule
    ],
    templateUrl: './documento-venta-form.component.html',
    styleUrls: ['./documento-venta-form.component.scss'],
    providers: [MessageService]
})
export class DocumentoVentaFormComponent implements OnInit {
    id: number | null = null;
    isEdit = false;
    doc: DocumentoVenta = {};
    selectedCliente: Cliente | null = null;
    clientesSugeridos: Cliente[] = [];
    productosSugeridos: Producto[] = [];
    clienteNombreCache: Record<number, string> = {};
    productoCache: Record<number, Producto> = {};
    empresas: Empresa[] = [];
    tiposDocumento: TipoDocumento[] = [];
    monedas: Moneda[] = [];
    condicionesPago: CondicionPago[] = [];
    unidadesMedida: UnidadMedida[] = [];
    saving = signal(false);
    loading = signal(false);

    dialogNuevoCliente = false;
    nuevoCliente: Cliente = { activo: true };
    guardandoCliente = false;

    dialogNuevoProducto = false;
    nuevoProducto: Partial<Producto> = { activo: true, precioVenta: 0, ivaPorcentaje: 10 };
    guardandoProducto = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private docService: DocumentoVentaService,
        private clienteService: ClienteService,
        private productService: ProductoService,
        private maestros: MaestrosService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.maestros.empresas().subscribe((e) => {
            this.empresas = e ?? [];
            if (!this.isEdit && this.empresas.length > 0 && !this.doc.empresa)
                this.doc.empresa = this.empresas[0] as unknown as { id: number };
        });
        this.maestros.tiposDocumento().subscribe((t) => {
            this.tiposDocumento = t ?? [];
            this.applyDefaults();
        });
        this.maestros.monedas().subscribe((m) => {
            this.monedas = m ?? [];
            this.applyDefaults();
        });
        this.maestros.condicionesPago().subscribe((c) => (this.condicionesPago = c ?? []));
        this.maestros.unidadesMedida().subscribe((u) => (this.unidadesMedida = u ?? []));

        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam && idParam !== 'nuevo') {
            this.id = +idParam;
            this.isEdit = true;
            this.loadDocumento();
        } else {
            this.initNewDoc();
        }
    }

    private applyDefaults(): void {
        if (this.doc.estado !== 'BORRADOR') return;
        if (!this.doc.tipoDocumento && this.tiposDocumento.length > 0) {
            const factura = this.tiposDocumento.find((t) => (t.nombre ?? '').toUpperCase().includes('FACTURA') || (t.codigoSet ?? '').toUpperCase().includes('FACTURA'));
            this.doc.tipoDocumento = factura ?? this.tiposDocumento[0];
        }
        if (!this.doc.moneda && this.monedas.length > 0) {
            const pyg = this.monedas.find((m) => (m.codigo ?? '').toUpperCase() === 'PYG');
            this.doc.moneda = pyg ?? this.monedas[0];
        }
    }

    private initNewDoc(): void {
        this.doc = {
            fechaEmision: new Date().toISOString().slice(0, 10),
            estado: 'BORRADOR',
            detalle: []
        };
        this.selectedCliente = null;
        this.applyDefaults();
    }

    private loadDocumento(): void {
        if (this.id == null) return;
        this.loading.set(true);
        this.docService.getById(this.id).subscribe({
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
                const tid = (this.doc.tipoDocumento as { id?: number })?.id;
                if (tid && this.tiposDocumento.length > 0) {
                    const t = this.tiposDocumento.find((x) => x.id === tid);
                    if (t) this.doc.tipoDocumento = t as unknown as { id: number };
                }
                const mid = (this.doc.moneda as { id?: number })?.id;
                if (mid && this.monedas.length > 0) {
                    const m = this.monedas.find((x) => x.id === mid);
                    if (m) this.doc.moneda = m as unknown as { id: number };
                }
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el documento.' });
                this.loading.set(false);
            }
        });
    }

    buscarClientes(event: AutoCompleteCompleteEvent): void {
        this.clienteService.buscar(event.query ?? '', 20).subscribe((r) => (this.clientesSugeridos = r ?? []));
    }

    buscarProductos(event: AutoCompleteCompleteEvent): void {
        this.maestros.productosBuscar(event.query ?? '', 20).subscribe((r) => (this.productosSugeridos = r ?? []));
    }

    onClienteSelect(): void {
        if (this.selectedCliente?.id) {
            this.doc.cliente = { id: this.selectedCliente.id };
            this.clienteNombreCache[this.selectedCliente.id] = this.selectedCliente.razonSocial ?? '';
        }
    }

    getProductoForLine(line: DocumentoVentaDetalle): Producto | null {
        if (!line.producto?.id) return null;
        return this.productoCache[line.producto.id] ?? null;
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

    addLine(): void {
        if (!this.doc.detalle) this.doc.detalle = [];
        const nro = this.doc.detalle.length + 1;
        this.doc.detalle.push({ nroLinea: nro, cantidad: 1, precioUnitario: 0, descuento: 0, subtotal: 0, totalLinea: 0 });
    }

    removeLine(line: DocumentoVentaDetalle): void {
        this.doc.detalle = (this.doc.detalle ?? []).filter((l) => l !== line);
        this.recalcTotales();
    }

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

    openNuevoCliente(): void {
        this.nuevoCliente = { activo: true };
        this.dialogNuevoCliente = true;
    }

    guardarNuevoCliente(): void {
        if (!this.nuevoCliente.razonSocial?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Razón social', detail: 'Ingresá la razón social.' });
            return;
        }
        this.guardandoCliente = true;
        this.clienteService.create(this.nuevoCliente).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Cliente creado', detail: 'Ya podés seleccionarlo en la búsqueda.' });
                this.dialogNuevoCliente = false;
                this.guardandoCliente = false;
                this.clienteService.buscar(this.nuevoCliente.razonSocial!.trim(), 1).subscribe((list) => {
                    const c = list?.[0];
                    if (c?.id) {
                        this.doc.cliente = { id: c.id };
                        this.selectedCliente = c;
                        this.clienteNombreCache[c.id] = c.razonSocial ?? '';
                    }
                });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo crear el cliente.' });
                this.guardandoCliente = false;
            }
        });
    }

    openNuevoProducto(): void {
        this.nuevoProducto = { activo: true, precioVenta: 0, ivaPorcentaje: 10 };
        if (this.unidadesMedida.length > 0) this.nuevoProducto.unidadMedida = this.unidadesMedida[0];
        this.dialogNuevoProducto = true;
    }

    guardarNuevoProducto(): void {
        if (!this.nuevoProducto.nombre?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Nombre', detail: 'Ingresá el nombre del producto.' });
            return;
        }
        if (!this.nuevoProducto.unidadMedida?.id) {
            this.messageService.add({ severity: 'warn', summary: 'Unidad', detail: 'Seleccioná la unidad de medida.' });
            return;
        }
        this.guardandoProducto = true;
        this.productService.create(this.nuevoProducto as Producto).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Producto creado', detail: 'Buscá el producto por nombre para agregarlo a la línea.' });
                this.dialogNuevoProducto = false;
                this.guardandoProducto = false;
                this.maestros.productosBuscar(this.nuevoProducto.nombre!.trim(), 1).subscribe((list) => {
                    const p = list?.[0];
                    if (p?.id) {
                        this.productoCache[p.id] = p;
                        this.addLine();
                        const lastLine = this.doc.detalle![this.doc.detalle!.length - 1];
                        this.onProductoSelect(lastLine, p);
                    }
                });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo crear el producto.' });
                this.guardandoProducto = false;
            }
        });
    }

    guardar(): void {
        if (!this.doc.cliente?.id) {
            this.messageService.add({ severity: 'warn', summary: 'Cliente requerido', detail: 'Seleccioná o cargá un cliente.' });
            return;
        }
        this.saving.set(true);
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
        const req = this.isEdit && this.doc.id ? this.docService.update(payload) : this.docService.create(payload);
        req.subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Guardado', detail: this.isEdit ? 'Documento actualizado.' : 'Documento creado.' });
                this.saving.set(false);
                this.router.navigate(['/pages/documentos-venta']);
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar.' });
                this.saving.set(false);
            }
        });
    }

    cancelar(): void {
        this.router.navigate(['/pages/documentos-venta']);
    }
}
