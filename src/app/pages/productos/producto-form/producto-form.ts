import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { ProductoService } from '../../service/producto.service';
import { ProductoComboDetalleService, ProductoComboDetalle } from '../../service/producto-combo-detalle.service';
import { MaestrosService, Producto, Categoria, UnidadMedida } from '../../service/maestros.service';

@Component({
    selector: 'app-producto-form',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        InputTextModule,
        InputNumberModule,
        ButtonModule,
        SelectModule,
        CheckboxModule,
        CardModule,
        ToastModule,
        TableModule
    ],
    templateUrl: './producto-form.component.html',
    styleUrls: ['./producto-form.component.scss'],
    providers: [MessageService]
})
export class ProductoFormComponent implements OnInit {
    producto: Producto = {};
    categorias: Categoria[] = [];
    unidadesMedida: UnidadMedida[] = [];
    productos: Producto[] = [];
    comboDetalleList: ProductoComboDetalle[] = [];
    selectedProductoCombo: Producto | null = null;
    cantidadCombo = 1;
    saving = signal(false);
    loadingCombo = signal(false);
    isEdit = false;
    id: number | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productoService: ProductoService,
        private comboDetalleService: ProductoComboDetalleService,
        private maestros: MaestrosService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        forkJoin({
            categorias: this.maestros.categorias(),
            unidades: this.maestros.unidadesMedida(),
            productos: this.maestros.productos()
        }).subscribe({
            next: ({ categorias, unidades, productos }) => {
                this.categorias = categorias ?? [];
                this.unidadesMedida = unidades ?? [];
                const raw = productos != null && typeof productos === 'object' && Array.isArray((productos as any).content)
                    ? (productos as any).content
                    : Array.isArray(productos)
                        ? productos
                        : [];
                this.productos = (raw as Producto[]).filter((x: any) => x.activo !== false);
                if (idParam && idParam !== 'nuevo') {
                    this.id = +idParam;
                    this.isEdit = true;
                    this.productoService.getById(this.id).subscribe({
                        next: (p) => {
                            this.producto = {
                                ...p,
                                precioVenta: p.precioVenta ?? 0,
                                ivaPorcentaje: p.ivaPorcentaje ?? 10,
                                categoria: p.categoria?.id != null ? this.categorias.find((c) => c.id === p.categoria!.id) ?? p.categoria : undefined,
                                unidadMedida: p.unidadMedida?.id != null ? this.unidadesMedida.find((u) => u.id === p.unidadMedida!.id) ?? p.unidadMedida : undefined
                            };
                            if (this.producto.esCombo && this.producto.id) this.loadComboDetalle();
                        },
                        error: () => {
                            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el producto.' });
                        }
                    });
                } else {
                    this.producto = {
                        activo: true,
                        esCombo: false,
                        alquilable: false,
                        precioVenta: 0,
                        ivaPorcentaje: 10
                    };
                    if (this.unidadesMedida.length > 0) {
                        this.producto.unidadMedida = this.unidadesMedida[0];
                    }
                }
            }
        });
    }

    /** Productos que se pueden agregar al combo (excluye el combo actual y los ya agregados). */
    get productosParaCombo(): Producto[] {
        const comboId = this.producto.id;
        const idsInCombo = new Set(this.comboDetalleList.map((d) => (d.producto as any)?.id).filter((id): id is number => id != null));
        return this.productos.filter((p) => p.id != null && p.id !== comboId && !idsInCombo.has(p.id));
    }

    loadComboDetalle(): void {
        const comboId = this.producto.id;
        if (comboId == null) return;
        this.loadingCombo.set(true);
        this.comboDetalleService.listByCombo(comboId).subscribe({
            next: (list) => {
                this.comboDetalleList = list ?? [];
                this.loadingCombo.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el detalle del combo.' });
                this.loadingCombo.set(false);
            }
        });
    }

    agregarAlCombo(): void {
        if (!this.selectedProductoCombo?.id || !this.producto.id || this.cantidadCombo < 0.0001) {
            this.messageService.add({ severity: 'warn', summary: 'Combo', detail: 'Seleccioná un producto y una cantidad.' });
            return;
        }
        this.comboDetalleService.create({
            productoCombo: { id: this.producto.id },
            producto: { id: this.selectedProductoCombo.id },
            cantidad: this.cantidadCombo
        }).subscribe({
            next: () => {
                this.loadComboDetalle();
                this.selectedProductoCombo = null;
                this.cantidadCombo = 1;
                this.messageService.add({ severity: 'success', summary: 'Agregado', detail: 'Producto agregado al combo.' });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo agregar.' });
            }
        });
    }

    quitarDelCombo(line: ProductoComboDetalle): void {
        if (line.id == null) return;
        this.comboDetalleService.delete(line.id).subscribe({
            next: () => {
                this.comboDetalleList = this.comboDetalleList.filter((l) => l.id !== line.id);
                this.messageService.add({ severity: 'success', summary: 'Quitado', detail: 'Producto quitado del combo.' });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo quitar.' });
            }
        });
    }

    actualizarCantidadCombo(line: ProductoComboDetalle): void {
        if (line.id == null || line.cantidad == null || line.cantidad < 0) return;
        this.comboDetalleService.update(line).subscribe({
            next: () => this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Cantidad actualizada.' }),
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo actualizar.' })
        });
    }

    getProductoNombre(d: ProductoComboDetalle): string {
        const p = d.producto;
        if (!p) return '-';
        return typeof p === 'object' && 'nombre' in p ? (p as Producto).nombre ?? (p as Producto).codigo ?? '-' : '-';
    }

    guardar(): void {
        if (!this.producto.nombre?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Nombre requerido', detail: 'Ingresá el nombre.' });
            return;
        }
        if (!this.producto.unidadMedida?.id) {
            this.messageService.add({ severity: 'warn', summary: 'Unidad de medida', detail: 'Seleccioná una unidad de medida.' });
            return;
        }
        this.saving.set(true);
        const req =
            this.isEdit && this.producto.id
                ? this.productoService.update(this.producto)
                : this.productoService.create(this.producto);
        req.subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: this.isEdit ? 'Producto actualizado.' : 'Producto creado.' });
                this.saving.set(false);
                this.router.navigate(['/pages/productos']);
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar.' });
                this.saving.set(false);
            }
        });
    }

    cancelar(): void {
        this.router.navigate(['/pages/productos']);
    }
}
