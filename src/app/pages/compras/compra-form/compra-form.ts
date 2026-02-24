import { Component, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { CompraService, Compra, CompraDetalle } from '../../service/compra.service';
import { ProveedorService, Proveedor } from '../../service/proveedor.service';
import { MaestrosService, Producto, Moneda, UnidadMedida } from '../../service/maestros.service';
import { ProductoService } from '../../service/producto.service';

@Component({
    selector: 'app-compra-form',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        InputTextModule,
        InputNumberModule,
        ButtonModule,
        SelectModule,
        TableModule,
        ToastModule,
        AutoCompleteModule,
        DialogModule
    ],
    templateUrl: './compra-form.component.html',
    styleUrls: ['./compra-form.component.scss'],
    providers: [MessageService]
})
export class CompraFormComponent implements OnInit {
    compra: Compra = { detalle: [] };
    proveedores: Proveedor[] = [];
    productosSugeridos: Producto[] = [];
    productoCache: Record<number, Producto> = {};
    monedas: Moneda[] = [];
    unidadesMedida: UnidadMedida[] = [];
    isEdit = false;
    id: number | null = null;
    saving = signal(false);

    dialogNuevoProducto = false;
    nuevoProducto: Partial<Producto> = { activo: true, costo: 0, ivaPorcentaje: 10 };
    guardandoProducto = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private compraService: CompraService,
        private proveedorService: ProveedorService,
        private maestros: MaestrosService,
        private productService: ProductoService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.maestros.unidadesMedida().subscribe((u) => (this.unidadesMedida = u ?? []));
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam && idParam !== 'nuevo') {
            this.id = +idParam;
            this.isEdit = true;
            forkJoin({
                monedas: this.maestros.monedas(),
                proveedores: this.proveedorService.listActivos(),
                compra: this.compraService.getById(+idParam)
            }).subscribe({
                next: ({ monedas, proveedores, compra }) => {
                    this.monedas = monedas ?? [];
                    this.proveedores = proveedores ?? [];
                    this.compra = compra;
                    if (!this.compra.detalle?.length) this.compra.detalle = [];
                    if (compra.proveedor?.id && this.proveedores.length) {
                        const full = this.proveedores.find((p) => p.id === compra.proveedor!.id) ?? compra.proveedor;
                        (this.compra as { proveedor?: { id: number } | Proveedor }).proveedor = full;
                    }
                    if (compra.moneda?.id && this.monedas.length) {
                        const fullMoneda = this.monedas.find((m) => m.id === compra.moneda!.id) ?? compra.moneda;
                        (this.compra as { moneda?: Moneda }).moneda = fullMoneda;
                    }
                    (compra.detalle ?? []).forEach((d) => {
                        if (d.producto?.id) this.productoCache[d.producto.id] = d.producto as Producto;
                    });
                },
                error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la compra.' })
            });
        } else {
            forkJoin({
                monedas: this.maestros.monedas(),
                proveedores: this.proveedorService.listActivos()
            }).subscribe(({ monedas, proveedores }) => {
                this.monedas = monedas ?? [];
                this.proveedores = proveedores ?? [];
                this.compra = {
                    fechaCompra: new Date().toISOString().slice(0, 10),
                    estado: 'BORRADOR',
                    detalle: []
                };
                this.applyDefaults();
                this.agregarLinea();
            });
        }
    }

    private applyDefaults(): void {
        if (this.compra.estado !== 'BORRADOR') return;
        if (!this.compra.moneda && this.monedas.length > 0) {
            const pyg = this.monedas.find((m) => (m.codigo ?? '').toUpperCase() === 'PYG');
            this.compra.moneda = pyg ?? this.monedas[0];
        }
    }

    monedaNoEsGuaranies(): boolean {
        const codigo = (this.compra.moneda as Moneda)?.codigo ?? '';
        return codigo.toUpperCase() !== 'PYG' && codigo !== '';
    }

    simboloMoneda(): string {
        const m = this.compra.moneda as Moneda | undefined;
        return m?.simbolo ?? m?.codigo ?? 'Gs.';
    }

    buscarProductos(event: AutoCompleteCompleteEvent): void {
        this.maestros.productosBuscar(event.query ?? '', 20).subscribe((r) => (this.productosSugeridos = r ?? []));
    }

    agregarLinea(): void {
        this.compra.detalle = this.compra.detalle ?? [];
        this.compra.detalle.push({
            producto: { id: 0 },
            cantidad: 1,
            precioUnitario: 0,
            totalLinea: 0
        });
    }

    quitarLinea(index: number): void {
        this.compra.detalle?.splice(index, 1);
    }

    /** Para p-autocomplete: devuelve el objeto producto completo para la línea. */
    getProductoForLine(line: CompraDetalle): Producto | null {
        const id = line.producto?.id;
        if (!id) return null;
        return this.productoCache[id] ?? null;
    }

    onProductoSelect(line: CompraDetalle, selected: Producto | null): void {
        if (!selected?.id) {
            line.producto = { id: 0 };
            return;
        }
        this.productoCache[selected.id] = selected;
        line.producto = { id: selected.id };
        if ((line.precioUnitario ?? 0) === 0 && (selected.costo ?? 0) > 0) {
            line.precioUnitario = selected.costo!;
        }
    }

    openNuevoProducto(): void {
        this.nuevoProducto = { activo: true, costo: 0, ivaPorcentaje: 10 };
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
                        this.agregarLinea();
                        const lastLine = this.compra.detalle![this.compra.detalle!.length - 1];
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
        if (!this.compra.proveedor?.id) {
            this.messageService.add({ severity: 'warn', summary: 'Proveedor requerido', detail: 'Seleccioná un proveedor.' });
            return;
        }
        if (!this.compra.detalle?.length || this.compra.detalle.every((d) => !d.producto?.id)) {
            this.messageService.add({ severity: 'warn', summary: 'Detalle', detail: 'Agregá al menos una línea con producto.' });
            return;
        }
        if (this.monedaNoEsGuaranies() && (!this.compra.cotizacion || this.compra.cotizacion <= 0)) {
            this.messageService.add({ severity: 'warn', summary: 'Cotización', detail: 'Ingresá la cotización para registrar el histórico de precios de compra.' });
            return;
        }
        this.saving.set(true);
        const payload: Compra = {
            proveedor: { id: this.compra.proveedor!.id! },
            fechaCompra: this.compra.fechaCompra,
            moneda: this.compra.moneda?.id ? { id: (this.compra.moneda as Moneda).id } : undefined,
            cotizacion: this.monedaNoEsGuaranies() ? this.compra.cotizacion : undefined,
            observaciones: this.compra.observaciones,
            detalle: (this.compra.detalle ?? [])
                .filter((d) => d.producto?.id)
                .map((d, i) => ({
                    nroLinea: i + 1,
                    producto: { id: d.producto!.id },
                    descripcion: d.descripcion,
                    cantidad: d.cantidad ?? 1,
                    precioUnitario: d.precioUnitario ?? 0
                }))
        };
        if (this.isEdit && this.compra.id) {
            payload.id = this.compra.id;
            this.compraService.update(payload).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Compra actualizada.' });
                    this.saving.set(false);
                    this.router.navigate(['/pages/compras']);
                },
                error: (err) => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar.' });
                    this.saving.set(false);
                }
            });
        } else {
            this.compraService.create(payload).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Compra creada.' });
                    this.saving.set(false);
                    this.router.navigate(['/pages/compras']);
                },
                error: (err) => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar.' });
                    this.saving.set(false);
                }
            });
        }
    }

    cancelar(): void {
        this.router.navigate(['/pages/compras']);
    }
}
