import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { StepperModule } from 'primeng/stepper';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { PresupuestoService, Presupuesto, PresupuestoDetalle } from '../../service/presupuesto.service';
import { ClienteService, Cliente } from '../../service/cliente.service';
import { MaestrosService, Producto, Moneda, Categoria, precioMayoristaParaCantidad } from '../../service/maestros.service';

interface CarritoLinea {
    producto: Producto;
    cantidad: number;
    precioUnitario: number;
    totalLinea: number;
}

@Component({
    selector: 'app-presupuesto-form',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        AutoCompleteModule,
        SelectModule,
        InputNumberModule,
        ButtonModule,
        InputTextModule,
        ToastModule,
        CardModule,
        StepperModule,
        IconFieldModule,
        InputIconModule
    ],
    templateUrl: './presupuesto-form.component.html',
    styleUrls: ['./presupuesto-form.component.scss'],
    providers: [MessageService]
})
export class PresupuestoFormComponent implements OnInit {
    presupuesto: Presupuesto = {};
    selectedCliente: Cliente | null = null;
    clientesSugeridos: Cliente[] = [];
    monedas: Moneda[] = [];
    productos = signal<Producto[]>([]);
    carrito = signal<CarritoLinea[]>([]);
    filtroProducto = signal('');
    categoriaIdSeleccionada = signal<number | null>(null);
    /** Lista de precios: minorista (precio_venta) o mayorista (precio_mayorista). */
    listaPrecios: 'minorista' | 'mayorista' = 'minorista';
    loading = signal(false);
    saving = signal(false);
    isEdit = false;
    id: number | null = null;

    tipoPedido = 'DELIVERY';
    fechaEmision = '';
    fechaValidez = '';
    direccionEntrega = '';
    telefonoContacto = '';
    observaciones = '';

    /** Paso actual del stepper: 1 = Cliente y datos, 2 = Productos, 3 = Resumen. */
    activeStep = 1;

    categoriasConProductos = computed(() => {
        const list = this.productos();
        const seen = new Map<number, Categoria>();
        list.forEach((p) => {
            const cat = p.categoria;
            if (cat?.id != null && !seen.has(cat.id)) seen.set(cat.id, cat);
        });
        return Array.from(seen.values()).sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''));
    });

    productosVisibles = computed(() => {
        const list = this.productos();
        const f = (this.filtroProducto() ?? '').toLowerCase().trim();
        const catId = this.categoriaIdSeleccionada();
        let out = list.filter((p) => (this.precioParaLista(p) ?? 0) >= 0);
        if (catId != null) out = out.filter((p) => p.categoria?.id === catId);
        if (!f) return out;
        return out.filter(
            (p) =>
                (p.nombre ?? '').toLowerCase().includes(f) ||
                (p.codigo ?? '').toLowerCase().includes(f)
        );
    });

    totalCarrito = computed(() => this.carrito().reduce((sum, l) => sum + l.totalLinea, 0));

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private presupuestoService: PresupuestoService,
        private clienteService: ClienteService,
        private maestros: MaestrosService,
        private messageService: MessageService
    ) {}

    /** Precio a mostrar en catálogo: minorista = precioVenta; mayorista = precio desde 5 u. */
    precioParaLista(p: Producto, cantidad?: number): number {
        if (this.listaPrecios === 'mayorista') {
            const pm = precioMayoristaParaCantidad(p, cantidad ?? 5);
            return pm ?? p.precioMayorista ?? p.precioVenta ?? 0;
        }
        return p.precioVenta ?? 0;
    }

    /** Recalcula precio unitario de una línea según cantidad (solo mayorista con rangos). */
    private actualizarPrecioLinea(linea: CarritoLinea): void {
        if (this.listaPrecios === 'mayorista') {
            const pu = precioMayoristaParaCantidad(linea.producto, linea.cantidad);
            if (pu != null) {
                linea.precioUnitario = pu;
                linea.totalLinea = linea.cantidad * pu;
            }
        } else {
            linea.totalLinea = linea.cantidad * linea.precioUnitario;
        }
    }

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam && idParam !== 'nuevo') {
            this.id = +idParam;
            this.isEdit = true;
        } else {
            const hoy = new Date();
            const emision = hoy.toISOString().slice(0, 10);
            const validez = new Date(hoy);
            validez.setDate(validez.getDate() + 15);
            const validezStr = validez.toISOString().slice(0, 10);
            this.presupuesto = {
                fechaEmision: emision,
                estado: 'BORRADOR',
                tipoPedido: 'DELIVERY',
                detalle: []
            };
            this.fechaEmision = emision;
            this.fechaValidez = validezStr;
            this.tipoPedido = this.presupuesto.tipoPedido ?? 'DELIVERY';
            this.selectedCliente = null;
        }
        this.maestros.monedas().subscribe((m) => (this.monedas = m ?? []));
        this.cargarProductos();
    }

    cargarProductos(): void {
        this.maestros.productos().subscribe({
            next: (body: unknown) => {
                const raw =
                    body != null && typeof body === 'object' && Array.isArray((body as any).content)
                        ? (body as any).content
                        : body != null && typeof body === 'object' && Array.isArray((body as any).data)
                            ? (body as any).data
                            : Array.isArray(body)
                                ? body
                                : [];
                const list = (raw as Producto[]).filter((x) => (x as any).activo !== false);
                this.productos.set(list);
                if (this.isEdit && this.id) this.loadPresupuesto();
            },
            error: () => this.productos.set([])
        });
    }

    loadPresupuesto(): void {
        if (!this.id) return;
        this.loading.set(true);
        this.presupuestoService.getById(this.id).subscribe({
            next: (p) => {
                this.presupuesto = { ...p };
                this.fechaEmision = p.fechaEmision ?? '';
                this.fechaValidez = p.fechaValidez ?? '';
                this.tipoPedido = p.tipoPedido ?? 'DELIVERY';
                this.direccionEntrega = p.direccionEntrega ?? '';
                this.telefonoContacto = p.telefonoContacto ?? '';
                this.observaciones = p.observaciones ?? '';
                this.presupuesto.moneda = p.moneda;
                this.selectedCliente = null;
                if (p.cliente?.id) {
                    this.clienteService.getById(p.cliente.id).subscribe({
                        next: (c) => (this.selectedCliente = c)
                    });
                }
                const prods = this.productos();
                const lineas: CarritoLinea[] = (p.detalle ?? []).map((d) => {
                    const prod = prods.find((x) => x.id === d.producto?.id) ?? {
                        id: d.producto?.id ?? 0,
                        nombre: d.descripcion ?? '-',
                        precioVenta: d.precioUnitario ?? 0
                    } as Producto;
                    const cant = d.cantidad ?? 1;
                    const pu = d.precioUnitario ?? 0;
                    return {
                        producto: prod,
                        cantidad: cant,
                        precioUnitario: pu,
                        totalLinea: cant * pu
                    };
                });
                this.carrito.set(lineas);
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el presupuesto.' });
                this.loading.set(false);
            }
        });
    }

    buscarClientes(event: AutoCompleteCompleteEvent): void {
        this.clienteService.buscar(event.query, 20).subscribe((r) => (this.clientesSugeridos = r ?? []));
    }

    onClienteSelect(): void {
        if (this.selectedCliente?.id) this.presupuesto.cliente = { id: this.selectedCliente.id };
    }

    onProductoClick(producto: Producto): void {
        const precio = this.listaPrecios === 'mayorista'
            ? (precioMayoristaParaCantidad(producto, 1) ?? producto.precioMayorista ?? producto.precioVenta ?? 0)
            : (producto.precioVenta ?? 0);
        if (precio <= 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Precio',
                detail: this.listaPrecios === 'mayorista' ? 'Este producto no tiene precio mayorista (definí al menos el rango 5 u.).' : 'Este producto no tiene precio de venta.'
            });
            return;
        }
        const existente = this.carrito().find((l) => l.producto.id === producto.id);
        if (existente) {
            existente.cantidad += 1;
            this.actualizarPrecioLinea(existente);
            this.carrito.update((list) => [...list]);
        } else {
            const pu = this.listaPrecios === 'mayorista' ? (precioMayoristaParaCantidad(producto, 1) ?? precio) : precio;
            this.carrito.update((list) => [...list, { producto, cantidad: 1, precioUnitario: pu, totalLinea: pu }]);
        }
    }

    agregarCantidad(linea: CarritoLinea): void {
        linea.cantidad += 1;
        this.actualizarPrecioLinea(linea);
        this.carrito.update((list) => [...list]);
    }

    restarCantidad(linea: CarritoLinea): void {
        if (linea.cantidad <= 1) {
            this.carrito.update((list) => list.filter((l) => l !== linea));
            return;
        }
        linea.cantidad -= 1;
        this.actualizarPrecioLinea(linea);
        this.carrito.update((list) => [...list]);
    }

    quitarDelCarrito(linea: CarritoLinea): void {
        this.carrito.update((list) => list.filter((l) => l !== linea));
    }

    guardar(): void {
        if (!this.presupuesto.cliente?.id && !this.selectedCliente?.id) {
            this.messageService.add({ severity: 'warn', summary: 'Cliente requerido', detail: 'Seleccione un cliente.' });
            return;
        }
        if (this.carrito().length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Detalle vacío', detail: 'Agregue al menos un producto.' });
            return;
        }
        const clienteId = this.presupuesto.cliente?.id ?? this.selectedCliente?.id;
        if (!clienteId) return;

        this.saving.set(true);
        const detalle: PresupuestoDetalle[] = this.carrito()
            .filter((l) => l.producto.id != null)
            .map((l, i) => ({
                nroLinea: (i + 1) as any,
                producto: { id: l.producto.id as number },
                descripcion: l.producto.nombre,
                cantidad: l.cantidad,
                precioUnitario: l.precioUnitario,
                totalLinea: l.totalLinea
            }));

        const payload: Presupuesto = {
            ...this.presupuesto,
            cliente: { id: clienteId },
            numero: this.presupuesto.numero?.trim() || undefined,
            fechaEmision: this.fechaEmision || undefined,
            fechaValidez: this.fechaValidez || undefined,
            tipoPedido: this.tipoPedido,
            direccionEntrega: this.direccionEntrega || undefined,
            telefonoContacto: this.telefonoContacto || undefined,
            observaciones: this.observaciones || undefined,
            moneda: this.presupuesto.moneda?.id ? { id: this.presupuesto.moneda.id } : undefined,
            subtotal: this.totalCarrito(),
            total: this.totalCarrito(),
            detalle
        };

        const req =
            this.isEdit && this.presupuesto.id ? this.presupuestoService.update(payload) : this.presupuestoService.create(payload);
        req.subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: this.isEdit ? 'Presupuesto actualizado.' : 'Presupuesto creado.' });
                this.saving.set(false);
                this.router.navigate(['/pages/presupuestos']);
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar.' });
                this.saving.set(false);
            }
        });
    }

    cancelar(): void {
        this.router.navigate(['/pages/presupuestos']);
    }

    puedeSiguientePaso(): boolean {
        if (this.activeStep === 1) return !!(this.presupuesto.cliente?.id || this.selectedCliente?.id);
        if (this.activeStep === 2) return this.carrito().length > 0;
        return false;
    }

    siguientePaso(): void {
        if (this.activeStep < 3 && this.puedeSiguientePaso()) this.activeStep++;
    }

    pasoAnterior(): void {
        if (this.activeStep > 1) this.activeStep--;
    }
}
