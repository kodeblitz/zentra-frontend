import { Component, OnInit, signal, computed, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PedidoService, Pedido, PedidoDetalle } from '../service/pedido.service';
import { ClienteService, Cliente } from '../service/cliente.service';
import { CajaService } from '../service/caja.service';
import { MaestrosService, Producto, Categoria } from '../service/maestros.service';

interface CarritoLinea {
    producto: Producto;
    cantidad: number;
    precioUnitario: number;
    totalLinea: number;
    /** Solo en modo alquiler: días de alquiler para esta línea. */
    dias?: number;
    /** Solo en modo alquiler: monto base = días × precio/día. */
    montoBase?: number;
    /** Solo en modo alquiler: monto final (editable); por defecto = montoBase. */
    montoFinal?: number;
}

@Component({
    selector: 'app-pdv',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        AutoCompleteModule,
        ToastModule,
        CardModule,
        DialogModule,
        IconFieldModule,
        InputIconModule,
        TooltipModule
    ],
    templateUrl: './pdv.component.html',
    styleUrls: ['./pdv.component.scss'],
    providers: [MessageService]
})
export class PdvComponent implements OnInit {
    productos = signal<Producto[]>([]);
    clientesSugeridos: Cliente[] = [];
    selectedCliente: Cliente | null = null;
    filtroProducto = signal('');
    categoriaIdSeleccionada = signal<number | null>(null);
    carrito = signal<CarritoLinea[]>([]);
    get clienteId(): number | null {
        return this.selectedCliente?.id ?? null;
    }
    /** Venta = pedido de venta; Alquiler = alquiler (productos alquilables, precio/día × días). */
    modoOperacion: 'venta' | 'alquiler' = 'venta';
    tipoPedido: string = 'DELIVERY';
    direccionEntrega = '';
    telefonoContacto = '';
    observaciones = '';

    dialogNuevoCliente = false;
    nuevoCliente: Cliente = {};
    submittedCliente = false;
    guardandoCliente = signal(false);

    descuentoPorcentaje = 0;
    lineaSeleccionada: CarritoLinea | null = null;
    private lastProductClickTime = 0;
    private readonly doubleClickMs = 400;

    /** Categorías que tienen al menos un producto (derivadas del catálogo cargado). */
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
        const modo = this.modoOperacion;
        const f = (this.filtroProducto() ?? '').toLowerCase().trim();
        const catId = this.categoriaIdSeleccionada();
        let out = list;
        if (modo === 'alquiler') {
            out = out.filter((p) => p.alquilable === true && (p.precioAlquilerDia ?? 0) > 0);
        } else {
            out = out.filter((p) => (p.precioVenta ?? 0) > 0);
        }
        if (catId != null) {
            out = out.filter((p) => p.categoria?.id === catId);
        }
        if (!f) return out;
        return out.filter(
            (p) =>
                (p.nombre ?? '').toLowerCase().includes(f) ||
                (p.codigo ?? '').toLowerCase().includes(f)
        );
    });

    totalCarrito = computed(() =>
        this.carrito().reduce((sum, l) => sum + this.getTotalEfectivoLinea(l), 0)
    );

    descuentoTotal = computed(() => {
        const sub = this.totalCarrito();
        return sub * (this.descuentoPorcentaje / 100);
    });

    totalConDescuento = computed(() => {
        return Math.max(0, this.totalCarrito() - this.descuentoTotal());
    });

    /** Si no hay caja abierta del usuario, no se puede usar el PDV. */
    cajaHabilitada = signal<boolean | null>(null);

    constructor(
        private pedidoService: PedidoService,
        private clienteService: ClienteService,
        private cajaService: CajaService,
        private maestros: MaestrosService,
        private messageService: MessageService,
        private router: Router,
        private ngZone: NgZone
    ) {}

    ngOnInit(): void {
        this.cajaService.getAbierta().subscribe({
            next: (caja) => {
                if (caja == null) {
                    this.cajaHabilitada.set(false);
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Caja requerida',
                        detail: 'Debe tener una caja abierta (asociada a su usuario) para usar el PDV.'
                    });
                    this.router.navigate(['/pages/caja']);
                    return;
                }
                this.cajaHabilitada.set(true);
                this.cargarProductos();
            },
            error: () => {
                this.cajaHabilitada.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo verificar la caja. Inicie sesión o abra una caja.'
                });
                this.router.navigate(['/pages/caja']);
            }
        });
    }

    private cargarProductos(): void {
        this.maestros.productos().subscribe({
            next: (body: unknown) => {
                const raw = body != null && typeof body === 'object' && Array.isArray((body as any).content)
                    ? (body as any).content
                    : body != null && typeof body === 'object' && Array.isArray((body as any).data)
                        ? (body as any).data
                        : Array.isArray(body)
                            ? body
                            : [];
                const list = (raw as Producto[]).filter((x) => (x as { activo?: boolean }).activo !== false);
                this.ngZone.run(() => this.productos.set(list));
            },
            error: (err) => {
                this.productos.set([]);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error al cargar productos',
                    detail: err?.error?.message || err?.message || 'No se pudo cargar el catálogo. Revisá que el backend esté en marcha.'
                });
            }
        });
    }

    buscarClientes(event: AutoCompleteCompleteEvent): void {
        this.clienteService.buscar(event.query, 20).subscribe((r) => (this.clientesSugeridos = r ?? []));
    }

    /** Un clic = +1 unidad; doble clic rápido = +2 unidades (detección manual). */
    onProductoClick(producto: Producto): void {
        const now = Date.now();
        if (now - this.lastProductClickTime < this.doubleClickMs) {
            this.agregarAlCarrito(producto);
            this.lastProductClickTime = 0;
            return;
        }
        this.lastProductClickTime = now;
        this.agregarAlCarrito(producto);
    }

    agregarAlCarrito(producto: Producto): void {
        const esAlquiler = this.modoOperacion === 'alquiler';
        const precio = esAlquiler ? (producto.precioAlquilerDia ?? 0) : (producto.precioVenta ?? 0);
        if (precio <= 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Precio no válido',
                detail: esAlquiler
                    ? 'Este producto no tiene precio de alquiler por día configurado o es cero.'
                    : 'Este producto no tiene precio de venta configurado o es cero.'
            });
            return;
        }
        const existente = this.carrito().find((l) => l.producto.id === producto.id);
        if (existente) {
            if (esAlquiler) {
                existente.dias = (existente.dias ?? 1) + 1;
                existente.montoBase = existente.precioUnitario * (existente.dias ?? 1);
            } else {
                existente.cantidad += 1;
                existente.totalLinea = existente.cantidad * existente.precioUnitario;
            }
            this.lineaSeleccionada = existente;
            this.carrito.update((list) => [...list]);
        } else {
            const dias = esAlquiler ? 1 : undefined;
            const montoBase = esAlquiler ? precio * (dias ?? 1) : undefined;
            const montoFinal = esAlquiler ? montoBase : undefined;
            const totalLinea = esAlquiler ? (montoFinal ?? precio) : precio;
            const nueva: CarritoLinea = { producto, cantidad: 1, precioUnitario: precio, totalLinea, dias, montoBase, montoFinal };
            this.carrito.update((list) => [...list, nueva]);
            this.lineaSeleccionada = nueva;
        }
    }

    /** Monto base alquiler = días × precio/día (para mostrar y por defecto del monto final). */
    getMontoBaseLinea(linea: CarritoLinea): number {
        if (this.modoOperacion !== 'alquiler') return linea.totalLinea ?? 0;
        return linea.montoBase ?? (linea.dias ?? 1) * (linea.precioUnitario ?? 0);
    }

    /** Total efectivo de la línea: en alquiler = montoFinal ?? base; en venta = totalLinea. */
    getTotalEfectivoLinea(linea: CarritoLinea): number {
        if (this.modoOperacion === 'alquiler') {
            return linea.montoFinal ?? this.getMontoBaseLinea(linea);
        }
        return linea.totalLinea ?? 0;
    }

    /** Actualiza días de una línea en modo alquiler; solo recalcula monto base. El monto final no se modifica (es el precio que se aplicará). */
    cambiarDiasLinea(linea: CarritoLinea, dias: number): void {
        if (this.modoOperacion !== 'alquiler') return;
        const d = Math.max(1, Math.floor(Number(dias) || 1));
        linea.dias = d;
        linea.montoBase = linea.precioUnitario * d;
        this.carrito.update((list) => [...list]);
    }

    /** Actualiza monto final de una línea (alquiler); el usuario puede fijar un valor único para el evento. */
    cambiarMontoFinalLinea(linea: CarritoLinea, monto: number | null | undefined): void {
        if (this.modoOperacion !== 'alquiler') return;
        const num = monto != null ? Number(monto) : NaN;
        const val = Number.isFinite(num) ? Math.max(0, num) : this.getMontoBaseLinea(linea);
        linea.montoFinal = val;
        linea.totalLinea = val;
        this.carrito.update((list) => [...list]);
    }

    agregarCantidad(linea: CarritoLinea): void {
        if (this.modoOperacion === 'alquiler') {
            linea.dias = (linea.dias ?? 1) + 1;
            linea.montoBase = linea.precioUnitario * (linea.dias ?? 1);
            this.carrito.update((list) => [...list]);
        } else {
            linea.cantidad += 1;
            linea.totalLinea = linea.cantidad * linea.precioUnitario;
        }
    }

    restarCantidad(linea: CarritoLinea): void {
        if (this.modoOperacion === 'alquiler') {
            const d = (linea.dias ?? 1) - 1;
            if (d < 1) {
                this.quitarDelCarrito(linea);
                return;
            }
            linea.dias = d;
            linea.montoBase = linea.precioUnitario * d;
            this.carrito.update((list) => [...list]);
        } else {
            if (linea.cantidad <= 1) {
                this.carrito.update((list) => list.filter((l) => l !== linea));
                return;
            }
            linea.cantidad -= 1;
            linea.totalLinea = linea.cantidad * linea.precioUnitario;
            this.carrito.update((list) => [...list]);
        }
    }

    /** Cambia entre Venta y Alquiler; vacía el carrito para no mezclar. */
    setModoOperacion(modo: 'venta' | 'alquiler'): void {
        if (this.modoOperacion === modo) return;
        this.modoOperacion = modo;
        this.carrito.set([]);
        this.lineaSeleccionada = null;
    }

    quitarDelCarrito(linea: CarritoLinea): void {
        if (this.lineaSeleccionada === linea) this.lineaSeleccionada = null;
        this.carrito.update((list) => list.filter((l) => l !== linea));
    }

    seleccionarLinea(linea: CarritoLinea): void {
        this.lineaSeleccionada = this.lineaSeleccionada === linea ? null : linea;
    }

    abrirNuevoCliente(): void {
        this.nuevoCliente = { activo: true };
        this.submittedCliente = false;
        this.dialogNuevoCliente = true;
    }

    cerrarDialogCliente(): void {
        this.dialogNuevoCliente = false;
        this.nuevoCliente = {};
        this.submittedCliente = false;
    }

    guardarNuevoCliente(): void {
        this.submittedCliente = true;
        if (!this.nuevoCliente.razonSocial?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Razón social', detail: 'Ingresá el nombre o razón social del cliente.' });
            return;
        }
        this.guardandoCliente.set(true);
        this.clienteService.create(this.nuevoCliente).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Cliente creado', detail: 'Ya podés seleccionarlo en la lista.' });
                this.cerrarDialogCliente();
                this.guardandoCliente.set(false);
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo crear el cliente.' });
                this.guardandoCliente.set(false);
            }
        });
    }

    crearPedido(): void {
        if (this.modoOperacion === 'alquiler') {
            this.messageService.add({ severity: 'info', summary: 'Alquileres', detail: 'El módulo de alquileres estará disponible cuando se implemente en el backend.' });
            return;
        }
        if (this.carrito().length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Carrito vacío', detail: 'Agregá al menos un producto.' });
            return;
        }
        if (!this.clienteId) {
            this.messageService.add({ severity: 'warn', summary: 'Cliente requerido', detail: 'Seleccioná un cliente.' });
            return;
        }
        if (this.tipoPedido === 'DELIVERY' && !this.direccionEntrega?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Dirección', detail: 'Para delivery ingresá la dirección de entrega.' });
            return;
        }

        const detalle: PedidoDetalle[] = this.carrito()
            .filter((l) => l.producto.id != null)
            .map((l, i) => ({
                nroLinea: i + 1,
                producto: { id: l.producto.id as number },
                descripcion: l.producto.nombre,
                cantidad: l.cantidad,
                precioUnitario: l.precioUnitario,
                totalLinea: this.getTotalEfectivoLinea(l)
            }));

        const pedido: Pedido = {
            cliente: { id: this.clienteId },
            fechaPedido: new Date().toISOString().slice(0, 10),
            estado: 'PENDIENTE',
            tipoPedido: this.tipoPedido,
            direccionEntrega: this.tipoPedido === 'DELIVERY' ? this.direccionEntrega : undefined,
            telefonoContacto: this.tipoPedido === 'DELIVERY' ? this.telefonoContacto : undefined,
            observaciones: this.observaciones || undefined,
            subtotal: this.totalCarrito(),
            total: this.totalConDescuento(),
            detalle
        };

        this.pedidoService.create(pedido).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Pedido creado', detail: 'El pedido se registró correctamente.' });
                this.carrito.set([]);
                this.observaciones = '';
                this.direccionEntrega = '';
                this.telefonoContacto = '';
                this.descuentoPorcentaje = 0;
                this.lineaSeleccionada = null;
            },
            error: (err) =>
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo crear el pedido.' })
        });
    }
}
