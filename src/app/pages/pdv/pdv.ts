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
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { switchMap, of, map } from 'rxjs';
import { PedidoService, Pedido, PedidoDetalle } from '../service/pedido.service';
import { ClienteService, Cliente } from '../service/cliente.service';
import { CajaService } from '../service/caja.service';
import { MaestrosService, Producto, Categoria } from '../service/maestros.service';
import { DocumentoVentaService } from '../service/documento-venta.service';
import { AlquilerService } from '../service/alquiler.service';
import { StockActualService } from '../service/stock-actual.service';

interface CarritoLinea {
    producto: Producto;
    cantidad: number;
    precioUnitario: number;
    /** Subtotal antes de descuento por línea: cantidad × precioUnitario. */
    totalLinea: number;
    /** Solo en modo alquiler: días de alquiler para esta línea. */
    dias?: number;
    /** Solo en modo alquiler: monto base = cantidad × días × precio/día. */
    montoBase?: number;
    /** Solo en modo alquiler: monto final (editable); por defecto = montoBase. */
    montoFinal?: number;
    /** Descuento % sobre subtotal (promo espontánea por línea). */
    descuentoPct?: number;
    /** Descuento en Gs (promo espontánea por línea). */
    descuentoMonto?: number;
    /** Si true, se muestra el bloque de promo (%; Gs.) para esta línea. */
    promoHabilitada?: boolean;
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
        TooltipModule,
        CheckboxModule
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
    /** Venta = pedido; Alquiler = alquiler; Ticket = cobro rápido con Consumidor Final (comida rápida/supers). */
    modoOperacion: 'venta' | 'alquiler' | 'ticket' = 'venta';
    /** Paso 1 = elegir productos y montos; Paso 2 = datos del cliente y crear. */
    pasoActual: 1 | 2 = 1;
    /** IN_SITU = venta/facturación en el momento (por defecto); DELIVERY = envío; RETIRO = retiro en local. */
    tipoPedido: string = 'IN_SITU';
    direccionEntrega = '';
    telefonoContacto = '';
    observaciones = '';
    /** Forma de pago: Efectivo, Transferencia o QR (TD 0 TC). */
    formaPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'QR' = 'EFECTIVO';
    /** Nº referencia del voucher de la procesadora (obligatorio cuando formaPago = QR). */
    referenciaVoucher = '';
    /** Solo en modo venta: si true, al crear el pedido se confirma, se factura y se emite la factura para entregar en el momento. Por defecto true cuando tipo es In situ. */
    facturarAhora = true;

    /** Solo en modo alquiler: fecha inicio y fin prevista del alquiler (YYYY-MM-DD). */
    fechaInicioAlquiler = '';
    fechaFinAlquiler = '';

    dialogNuevoCliente = false;
    nuevoCliente: Cliente = {};
    submittedCliente = false;
    guardandoCliente = signal(false);

    /** Descuento % general sobre el subtotal (signal para que los computed reaccionen). */
    descuentoPorcentaje = signal(0);
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
        const pct = Number(this.descuentoPorcentaje()) || 0;
        return sub * (pct / 100);
    });

    totalConDescuento = computed(() => {
        return Math.max(0, this.totalCarrito() - this.descuentoTotal());
    });

    /** Monto total descontado por promos en líneas (para mostrar en resumen paso 2). */
    totalDescuentoEnLineas = computed(() => {
        return this.carrito().reduce((sum, l) => {
            if (this.modoOperacion === 'alquiler') {
                const base = this.getMontoBaseLinea(l);
                const efectivo = this.getTotalEfectivoLinea(l);
                return sum + Math.max(0, base - efectivo);
            }
            const sub = (l.cantidad ?? 1) * (l.precioUnitario ?? 0);
            return sum + Math.max(0, sub - this.getTotalEfectivoLinea(l));
        }, 0);
    });

    /** Si no hay caja abierta del usuario, no se puede usar el PDV. */
    cajaHabilitada = signal<boolean | null>(null);

    /** Stock actual por producto (suma en todos los depósitos). Para alerta visual: verde ≥15, naranja 1-14, rojo 0. */
    stockPorProducto = signal<Map<number, number>>(new Map());

    constructor(
        private pedidoService: PedidoService,
        private clienteService: ClienteService,
        private cajaService: CajaService,
        private maestros: MaestrosService,
        private messageService: MessageService,
        private documentoVentaService: DocumentoVentaService,
        private alquilerService: AlquilerService,
        private stockActualService: StockActualService,
        private router: Router,
        private ngZone: NgZone
    ) {}

    /** Cliente "Consumidor Final" para modo ticket (cobro rápido). */
    clienteConsumidorFinal = signal<Cliente | null>(null);

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
                this.cargarConsumidorFinal();
                this.cargarStock();
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

    private cargarConsumidorFinal(): void {
        this.clienteService.listActivos().subscribe({
            next: (list) => {
                const cf = list?.find(
                    (c) =>
                        (c.razonSocial ?? '').toLowerCase().includes('consumidor final') ||
                        (c.codigo ?? '').toUpperCase() === 'CLI-001'
                ) ?? list?.[0] ?? null;
                this.ngZone.run(() => this.clienteConsumidorFinal.set(cf ?? null));
            }
        });
    }

    private cargarStock(): void {
        this.stockActualService.list().subscribe({
            next: (list) => {
                const map = new Map<number, number>();
                (list ?? []).forEach((s) => {
                    const id = s.productoId ?? s.producto?.id;
                    if (id != null) {
                        const prev = map.get(id) ?? 0;
                        map.set(id, prev + (s.cantidad ?? 0));
                    }
                });
                this.ngZone.run(() => this.stockPorProducto.set(map));
            }
        });
    }

    /** Cantidad en stock del producto (suma en todos los depósitos). */
    getStockProducto(productoId: number | undefined): number {
        if (productoId == null) return 0;
        return this.stockPorProducto().get(productoId) ?? 0;
    }

    /** Clase CSS para borde según stock: verde ≥15, naranja 1-14, rojo 0. */
    getClaseStockProducto(p: Producto): string {
        const stock = this.getStockProducto(p.id);
        if (stock <= 0) return 'pdv-stock-sin';
        if (stock < 15) return 'pdv-stock-bajo';
        return 'pdv-stock-ok';
    }

    /** Tooltip con texto de stock para la tarjeta del producto. */
    getTooltipStockProducto(p: Producto): string {
        const stock = this.getStockProducto(p.id);
        if (stock <= 0) return 'Sin stock';
        if (stock < 15) return `Stock bajo: ${stock} unidad(es)`;
        return `${stock} en stock`;
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
        const precioBase = esAlquiler ? (producto.precioAlquilerDia ?? 0) : (producto.precioVenta ?? 0);
        if (precioBase <= 0) {
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
                existente.cantidad = (existente.cantidad ?? 1) + 1;
                const dias = existente.dias ?? 1;
                existente.montoBase = (existente.cantidad ?? 1) * dias * (existente.precioUnitario ?? 0);
                existente.montoFinal = existente.montoBase;
                existente.totalLinea = existente.montoBase;
                this.lineaSeleccionada = existente;
                this.carrito.update((list) => [...list]);
            } else {
                existente.cantidad += 1;
                this.actualizarPrecioPorCantidad(existente);
            }
            this.lineaSeleccionada = existente;
        } else {
            if (esAlquiler) {
                const dias = 1;
                const montoBase = precioBase * dias;
                const nueva: CarritoLinea = {
                    producto, cantidad: 1, precioUnitario: precioBase,
                    totalLinea: montoBase, dias, montoBase, montoFinal: montoBase
                };
                this.carrito.update((list) => [...list, nueva]);
                this.lineaSeleccionada = nueva;
            } else {
                const id = producto.id as number;
                this.maestros.getPrecioParaCantidad(id, 1).subscribe({
                    next: (r) => {
                        const nueva: CarritoLinea = {
                            producto, cantidad: 1, precioUnitario: r.precioUnitario, totalLinea: r.totalSugerido
                        };
                        this.carrito.update((list) => [...list, nueva]);
                        this.lineaSeleccionada = nueva;
                    },
                    error: () => {
                        const nueva: CarritoLinea = {
                            producto, cantidad: 1, precioUnitario: precioBase, totalLinea: precioBase
                        };
                        this.carrito.update((list) => [...list, nueva]);
                        this.lineaSeleccionada = nueva;
                    }
                });
            }
        }
    }

    /** Actualiza precio unitario y subtotal de la línea según cantidad (venta; precios por cantidad). */
    private actualizarPrecioPorCantidad(linea: CarritoLinea): void {
        const id = linea.producto.id as number;
        const q = linea.cantidad;
        this.maestros.getPrecioParaCantidad(id, q).subscribe({
            next: (r) => {
                linea.precioUnitario = r.precioUnitario;
                linea.totalLinea = r.totalSugerido;
                this.carrito.update((list) => [...list]);
            },
            error: () => {
                linea.totalLinea = linea.cantidad * linea.precioUnitario;
                this.carrito.update((list) => [...list]);
            }
        });
    }

    /** Monto base alquiler = cantidad × días × precio/día (para mostrar y por defecto del monto final). */
    getMontoBaseLinea(linea: CarritoLinea): number {
        if (this.modoOperacion !== 'alquiler') return linea.totalLinea ?? 0;
        return linea.montoBase ?? (linea.cantidad ?? 1) * (linea.dias ?? 1) * (linea.precioUnitario ?? 0);
    }

    /** Total efectivo de la línea: en alquiler = montoFinal ?? base; en venta = subtotal con descuento % y monto. */
    getTotalEfectivoLinea(linea: CarritoLinea): number {
        if (this.modoOperacion === 'alquiler') {
            return linea.montoFinal ?? this.getMontoBaseLinea(linea);
        }
        const sub = linea.totalLinea ?? linea.cantidad * linea.precioUnitario;
        const pct = (linea.descuentoPct ?? 0) / 100;
        const monto = linea.descuentoMonto ?? 0;
        return Math.max(0, sub * (1 - pct) - monto);
    }

    /** True si la línea tiene descuento (promo) aplicado; sirve para identificar en PDV y reportes. */
    lineaTieneDescuento(linea: CarritoLinea): boolean {
        return (linea.descuentoPct ?? 0) > 0 || (linea.descuentoMonto ?? 0) > 0;
    }

    /** Texto corto del descuento de la línea para identificación (ej. "10%", "2.000 Gs.", "5% + 1.000 Gs."). */
    getDescuentoLineaLabel(linea: CarritoLinea): string {
        const pct = linea.descuentoPct ?? 0;
        const monto = linea.descuentoMonto ?? 0;
        if (pct > 0 && monto > 0) return `-${pct}% / -${monto.toLocaleString('es-PY')} Gs.`;
        if (pct > 0) return `-${pct}%`;
        if (monto > 0) return `-${monto.toLocaleString('es-PY')} Gs.`;
        return '';
    }

    /** Actualiza días de una línea en modo alquiler; recalcula monto base y sincroniza monto final. */
    cambiarDiasLinea(linea: CarritoLinea, dias: number): void {
        if (this.modoOperacion !== 'alquiler') return;
        const d = Math.max(1, Math.floor(Number(dias) || 1));
        linea.dias = d;
        const cant = linea.cantidad ?? 1;
        linea.montoBase = cant * d * (linea.precioUnitario ?? 0);
        linea.montoFinal = linea.montoBase;
        linea.totalLinea = linea.montoBase;
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
            linea.cantidad = (linea.cantidad ?? 1) + 1;
            const dias = linea.dias ?? 1;
            linea.montoBase = (linea.cantidad ?? 1) * dias * (linea.precioUnitario ?? 0);
            linea.montoFinal = linea.montoBase;
            linea.totalLinea = linea.montoBase;
            this.carrito.update((list) => [...list]);
        } else {
            linea.cantidad += 1;
            this.actualizarPrecioPorCantidad(linea);
        }
    }

    restarCantidad(linea: CarritoLinea): void {
        if (this.modoOperacion === 'alquiler') {
            const cant = (linea.cantidad ?? 1) - 1;
            if (cant < 1) {
                this.quitarDelCarrito(linea);
                return;
            }
            linea.cantidad = cant;
            const dias = linea.dias ?? 1;
            linea.montoBase = cant * dias * (linea.precioUnitario ?? 0);
            linea.montoFinal = linea.montoBase;
            linea.totalLinea = linea.montoBase;
            this.carrito.update((list) => [...list]);
        } else {
            if (linea.cantidad <= 1) {
                this.carrito.update((list) => list.filter((l) => l !== linea));
                return;
            }
            linea.cantidad -= 1;
            this.actualizarPrecioPorCantidad(linea);
        }
    }

    /** Muestra u oculta el bloque de promo (%; Gs.) para esta línea. */
    togglePromoLinea(linea: CarritoLinea): void {
        linea.promoHabilitada = !linea.promoHabilitada;
        this.carrito.update((list) => [...list]);
    }

    /** Aplica descuento % o monto a la línea seleccionada (promo espontánea). */
    aplicarDescuentoLinea(linea: CarritoLinea, descuentoPct: number | null, descuentoMonto: number | null): void {
        if (descuentoPct != null) linea.descuentoPct = Math.max(0, Math.min(100, descuentoPct));
        if (descuentoMonto != null) linea.descuentoMonto = Math.max(0, descuentoMonto);
        this.carrito.update((list) => [...list]);
    }

    /** Cambia entre Venta, Alquiler y Ticket; vacía el carrito y vuelve al paso 1. */
    setModoOperacion(modo: 'venta' | 'alquiler' | 'ticket'): void {
        if (this.modoOperacion === modo) return;
        this.modoOperacion = modo;
        this.carrito.set([]);
        this.lineaSeleccionada = null;
        this.pasoActual = 1;
        if (modo === 'ticket') {
            this.selectedCliente = this.clienteConsumidorFinal() ?? null;
            this.tipoPedido = 'IN_SITU';
            this.facturarAhora = true;
        }
        const today = new Date();
        this.fechaInicioAlquiler = today.toISOString().slice(0, 10);
        const fin = new Date(today);
        fin.setDate(fin.getDate() + 1);
        this.fechaFinAlquiler = fin.toISOString().slice(0, 10);
    }

    /** Pasa al paso 2 (datos del cliente) si hay ítems en el carrito. */
    irAPasoCliente(): void {
        if (this.carrito().length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Carrito vacío', detail: 'Agregá al menos un producto para continuar.' });
            return;
        }
        if (this.modoOperacion === 'alquiler' && (!this.fechaInicioAlquiler || !this.fechaFinAlquiler)) {
            const today = new Date();
            this.fechaInicioAlquiler = today.toISOString().slice(0, 10);
            const fin = new Date(today);
            fin.setDate(fin.getDate() + 1);
            this.fechaFinAlquiler = fin.toISOString().slice(0, 10);
        }
        this.pasoActual = 2;
    }

    /** Vuelve al paso 1 para editar productos y montos. */
    volverAPasoProductos(): void {
        this.pasoActual = 1;
    }

    /** Condición de deshabilitado del botón Crear pedido / Cobrar ticket (alineado con el tooltip). */
    crearPedidoDisabled(): boolean {
        if (this.modoOperacion === 'ticket') {
            return this.carrito().length === 0 || !(this.clienteConsumidorFinal()?.id ?? this.clienteId);
        }
        if (this.modoOperacion === 'alquiler') {
            if (this.carrito().length === 0) return true;
            if (!this.clienteId) return true;
            if (!this.fechaInicioAlquiler || !this.fechaFinAlquiler) return true;
            if (this.fechaFinAlquiler < this.fechaInicioAlquiler) return true;
            return false;
        }
        if (this.carrito().length === 0) return true;
        if (!this.clienteId) return true;
        if (this.tipoPedido === 'DELIVERY' && !this.direccionEntrega?.trim()) return true;
        if (this.formaPago === 'QR' && !this.referenciaVoucher?.trim()) return true;
        return false;
    }

    /** Tooltip del botón Crear pedido / Cobrar ticket: indica por qué está deshabilitado o mensaje cuando está listo. */
    getTooltipCrearPedido(): string {
        if (this.modoOperacion === 'ticket') {
            if (this.carrito().length === 0) return 'Agregá productos y tocá Cobrar.';
            if (!(this.clienteConsumidorFinal()?.id ?? this.clienteId)) return 'No hay cliente Consumidor Final configurado. Creá uno en Clientes.';
            return this.selectedCliente ? `Emitir factura a nombre de ${this.selectedCliente.razonSocial ?? 'cliente'}.` : 'Emitir ticket (Consumidor Final) y abrir impresión.';
        }
        if (this.modoOperacion === 'alquiler') {
            if (this.carrito().length === 0) return 'Agregá al menos un producto al carrito.';
            if (!this.clienteId) return 'Seleccioná un cliente para continuar.';
            if (!this.fechaInicioAlquiler || !this.fechaFinAlquiler) return 'Indicá fecha de inicio y fin del alquiler.';
            if (this.fechaFinAlquiler < this.fechaInicioAlquiler) return 'La fecha fin debe ser igual o posterior a la fecha de inicio.';
            return 'Crear alquiler. Luego podés confirmarlo y gestionar entrega/devolución en Alquileres.';
        }
        if (this.carrito().length === 0) return 'Agregá al menos un producto al carrito.';
        if (!this.clienteId) return 'Seleccioná un cliente para continuar.';
        if (this.tipoPedido === 'DELIVERY' && !this.direccionEntrega?.trim()) return 'Para delivery ingresá la dirección de entrega.';
        if (this.formaPago === 'QR' && !this.referenciaVoucher?.trim()) return 'Para pago con QR ingresá el nº de referencia del voucher de la procesadora.';
        return this.facturarAhora ? 'Crear pedido y generar factura para entregar en el momento.' : 'Crear pedido. Podés facturarlo después en Pedidos.';
    }

    /** Actualiza el descuento % general desde el input (valor numérico para que los computed reaccionen). */
    actualizarDescuentoGeneral(val: number | null | undefined): void {
        const n = val != null ? Number(val) : 0;
        this.descuentoPorcentaje.set(Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0);
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
            const detalle = this.carrito()
                .filter((l) => l.producto.id != null)
                .map((l, i) => ({
                    nroLinea: i + 1,
                    producto: { id: l.producto.id as number },
                    descripcion: l.producto.nombre,
                    cantidad: l.cantidad ?? 1,
                    diasAlquiler: l.dias ?? 1,
                    precioAlquilerDia: l.precioUnitario,
                    montoLinea: this.getTotalEfectivoLinea(l)
                }));
            const alquiler = {
                cliente: { id: this.clienteId! },
                fechaInicio: this.fechaInicioAlquiler,
                fechaFinPrevista: this.fechaFinAlquiler,
                observaciones: this.observaciones?.trim() || undefined,
                detalle
            };
            this.alquilerService.create(alquiler).subscribe({
                next: (a) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Alquiler creado',
                        detail: `Alquiler ${a.numero ?? a.id} registrado. Podés confirmarlo y ver el detalle en Alquileres.`
                    });
                    this.carrito.set([]);
                    this.pasoActual = 1;
                    this.observaciones = '';
                    this.lineaSeleccionada = null;
                    if (a.id) this.router.navigate(['/pages/alquileres/ver', a.id]);
                },
                error: (err) =>
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo crear el alquiler.' })
            });
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
        if (this.formaPago === 'QR' && !this.referenciaVoucher?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Referencia voucher', detail: 'Para pago con QR ingresá el nº de referencia del voucher de la procesadora.' });
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
                descuento: l.descuentoPct ?? 0,
                descuentoMonto: l.descuentoMonto ?? 0,
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
            formaPago: this.formaPago,
            referenciaVoucher: this.formaPago === 'QR' ? (this.referenciaVoucher?.trim() || undefined) : undefined,
            subtotal: this.totalCarrito(),
            total: this.totalConDescuento(),
            detalle
        };

        const resetCarritoYForm = (): void => {
            this.carrito.set([]);
            this.tipoPedido = 'IN_SITU';
            this.facturarAhora = true;
            this.observaciones = '';
            this.direccionEntrega = '';
            this.telefonoContacto = '';
            this.formaPago = 'EFECTIVO';
            this.referenciaVoucher = '';
            this.descuentoPorcentaje.set(0);
            this.lineaSeleccionada = null;
            this.pasoActual = 1;
        };

        const successFactura = (doc: { id: number; numero?: string; numeroCompleto?: string }): void => {
            this.messageService.add({
                severity: 'success',
                summary: 'Factura emitida',
                detail: `Factura ${doc.numeroCompleto ?? doc.numero ?? doc.id} emitida. Podés verla o imprimirla en Documentos de venta.`
            });
            resetCarritoYForm();
        };

        const abrirTicketPrint = (docId: number): void => {
            const tree = this.router.createUrlTree(['/pages', 'documentos-venta', 'ver', docId], { queryParams: { vista: 'ticket' } });
            const url = window.location.origin + this.router.serializeUrl(tree);
            window.open(url, 'ticket-print', 'width=400,height=600,scrollbars=yes');
        };

        // Modo ticket: factura in situ con Consumidor Final, emitir y abrir ventana ticket para imprimir
        if (this.modoOperacion === 'ticket') {
            const cfId = this.clienteConsumidorFinal()?.id ?? this.clienteId;
            if (!cfId) {
                this.messageService.add({ severity: 'warn', summary: 'Cliente', detail: 'No hay Consumidor Final. Creá uno en Clientes.' });
                return;
            }
            const facturaPayload = {
                clienteId: cfId,
                observaciones: undefined,
                detalle: this.carrito()
                    .filter((l) => l.producto.id != null)
                    .map((l) => ({
                        productoId: l.producto.id as number,
                        descripcion: l.producto.nombre,
                        cantidad: l.cantidad,
                        precioUnitario: l.precioUnitario,
                        descuento: l.descuentoPct ?? 0,
                        descuentoMonto: l.descuentoMonto ?? 0,
                        totalLinea: this.getTotalEfectivoLinea(l)
                    }))
            };
            this.documentoVentaService.facturaInSitu(facturaPayload).pipe(
                switchMap((doc) =>
                    this.documentoVentaService.emitir(doc.id!).pipe(map(() => doc))
                )
            ).subscribe({
                next: (doc) => {
                    resetCarritoYForm();
                    this.messageService.add({ severity: 'success', summary: 'Ticket emitido', detail: `N° ${doc.numeroCompleto ?? doc.numero}. Se abrió la ventana para imprimir.` });
                    abrirTicketPrint(doc.id!);
                },
                error: (err) =>
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo emitir el ticket.' })
            });
            return;
        }

        // Venta in situ: no se crea pedido, solo factura directa
        if (this.tipoPedido === 'IN_SITU' && this.facturarAhora) {
            const facturaPayload = {
                clienteId: this.clienteId!,
                observaciones: this.observaciones?.trim() || undefined,
                detalle: this.carrito()
                    .filter((l) => l.producto.id != null)
                    .map((l) => ({
                        productoId: l.producto.id as number,
                        descripcion: l.producto.nombre,
                        cantidad: l.cantidad,
                        precioUnitario: l.precioUnitario,
                        descuento: l.descuentoPct ?? 0,
                        descuentoMonto: l.descuentoMonto ?? 0,
                        totalLinea: this.getTotalEfectivoLinea(l)
                    }))
            };
            this.documentoVentaService.facturaInSitu(facturaPayload).pipe(
                switchMap((doc) =>
                    this.documentoVentaService.emitir(doc.id!).pipe(map(() => doc))
                )
            ).subscribe({
                next: successFactura,
                error: (err) =>
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo emitir la factura.' })
            });
            return;
        }

        // Flujo con pedido: crear pedido y opcionalmente facturar y marcar entregado
        this.pedidoService.create(pedido).pipe(
            switchMap((pedidoCreado) => {
                if (!this.facturarAhora || !pedidoCreado?.id) {
                    return of({ doc: null as { id: number; numero?: string } | null });
                }
                return this.pedidoService.confirmar(pedidoCreado.id).pipe(
                    switchMap(() => this.pedidoService.facturar(pedidoCreado.id!)),
                    switchMap((doc) =>
                        this.documentoVentaService.emitir(doc.id!).pipe(map(() => doc))
                    ),
                    switchMap((doc) =>
                        this.pedidoService.marcarEntregado(pedidoCreado.id!).pipe(map(() => doc))
                    ),
                    map((doc) => ({ doc: { id: doc.id!, numero: doc.numero } }))
                );
            })
        ).subscribe({
            next: ({ doc }) => {
                if (doc) {
                    successFactura(doc);
                } else {
                    this.messageService.add({ severity: 'success', summary: 'Pedido creado', detail: 'El pedido se registró correctamente. Podés facturarlo después en Pedidos.' });
                    resetCarritoYForm();
                }
            },
            error: (err) =>
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo completar la operación.' })
        });
    }
}
