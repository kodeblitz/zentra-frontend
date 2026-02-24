import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService, ConfirmationService } from 'primeng/api';
import { MovimientoStockService, MovimientoStock, TipoMovimientoRef, EstadoMovimientoRef } from '../service/movimiento-stock.service';
import { StockActualService, StockActual } from '../service/stock-actual.service';
import { DepositoService, Deposito } from '../service/deposito.service';
import { MaestrosService, Producto } from '../service/maestros.service';

@Component({
    selector: 'app-inventario',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        SelectModule,
        InputTextModule,
        InputNumberModule,
        TabsModule,
        TagModule,
        ToastModule,
        ConfirmDialogModule,
        IconFieldModule,
        InputIconModule
    ],
    templateUrl: './inventario.component.html',
    styleUrls: ['./inventario.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class InventarioComponent implements OnInit {
    activeTab = 0;

    movimientos = signal<MovimientoStock[]>([]);
    movimientosRaw: MovimientoStock[] = [];
    depositos: Deposito[] = [];
    productos: Producto[] = [];
    filterDesde = '';
    filterHasta = '';
    filterDepositoId: number | null = null;
    filterProductoId: number | null = null;
    loadingMov = signal(false);

    stockActual = signal<StockActual[]>([]);
    loadingStock = signal(false);
    filterStockDepositoId: number | null = null;

    // Carga rápida / ajuste inventario
    cargaRapidaDepositoId: number | null = null;
    stockParaAjuste = signal<StockActual[]>([]);
    cantidadContada = signal<Record<string, number>>({});
    loadingCargaRapida = signal(false);
    aplicandoId = signal<string | null>(null);
    tiposMovimiento: TipoMovimientoRef[] = [];
    estadoBorrador: EstadoMovimientoRef | null = null;

    movimientosFiltrados = computed(() => {
        const list = this.movimientos();
        const depId = this.filterDepositoId;
        const prodId = this.filterProductoId;
        if (depId == null && prodId == null) return list;
        return list.filter((m) => {
            if (depId != null && m.deposito?.id !== depId) return false;
            if (prodId != null && m.producto?.id !== prodId) return false;
            return true;
        });
    });

    constructor(
        private movimientoStockService: MovimientoStockService,
        private stockActualService: StockActualService,
        private depositoService: DepositoService,
        private maestros: MaestrosService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.setDefaultFechas();
        this.loadDepositos();
        this.loadProductos();
        this.loadMovimientos();
        this.loadStockActual();
        this.loadTiposYEstadosMovimiento();
    }

    private loadTiposYEstadosMovimiento(): void {
        this.movimientoStockService.getTiposActivos().subscribe({
            next: (list) => (this.tiposMovimiento = list ?? [])
        });
        this.movimientoStockService.getEstadosActivos().subscribe({
            next: (list) => {
                const borrador = (list ?? []).find((e) => e.codigo === 'BORRADOR');
                this.estadoBorrador = borrador ?? null;
            }
        });
    }

    private setDefaultFechas(): void {
        const hoy = new Date();
        const hace30 = new Date(hoy);
        hace30.setDate(hace30.getDate() - 30);
        this.filterDesde = hace30.toISOString().slice(0, 10);
        this.filterHasta = hoy.toISOString().slice(0, 10);
    }

    loadDepositos(): void {
        this.depositoService.list().subscribe({
            next: (list) => (this.depositos = list ?? []),
            error: () => (this.depositos = [])
        });
    }

    loadProductos(): void {
        this.maestros.productos().subscribe({
            next: (body: unknown) => {
                const raw = body != null && typeof body === 'object' && Array.isArray((body as { content?: unknown[] }).content)
                    ? (body as { content: unknown[] }).content
                    : body != null && typeof body === 'object' && Array.isArray((body as { data?: unknown[] }).data)
                        ? (body as { data: unknown[] }).data
                        : Array.isArray(body)
                            ? body
                            : [];
                this.productos = (raw as Producto[]) ?? [];
            },
            error: () => (this.productos = [])
        });
    }

    loadMovimientos(): void {
        const desde = this.filterDesde || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const hasta = this.filterHasta || new Date().toISOString().slice(0, 10);
        this.loadingMov.set(true);
        this.movimientoStockService.listPorFechas(desde, hasta).subscribe({
            next: (list) => {
                this.movimientosRaw = list ?? [];
                this.movimientos.set(list ?? []);
                this.loadingMov.set(false);
            },
            error: () => {
                this.movimientos.set([]);
                this.loadingMov.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los movimientos.' });
            }
        });
    }

    loadStockActual(): void {
        this.loadingStock.set(true);
        const depId = this.filterStockDepositoId;
        const obs = depId != null ? this.stockActualService.listPorDeposito(depId) : this.stockActualService.list();
        obs.subscribe({
            next: (list) => {
                this.stockActual.set(list ?? []);
                this.loadingStock.set(false);
            },
            error: () => {
                this.stockActual.set([]);
                this.loadingStock.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el stock actual.' });
            }
        });
    }

    onFilterMovimientos(): void {
        this.loadMovimientos();
    }

    onFilterStock(): void {
        this.loadStockActual();
    }

    getProductoNombre(prod: { id?: number; nombre?: string; codigo?: string } | undefined): string {
        if (!prod) return '-';
        return prod.nombre || prod.codigo || `#${prod.id}` || '-';
    }

    getDepositoNombre(dep: { id?: number; nombre?: string; codigo?: string } | undefined): string {
        if (!dep) return '-';
        return dep.nombre || dep.codigo || `#${dep.id}` || '-';
    }

    getTipoNombre(m: MovimientoStock): string {
        return m.tipoMovimiento?.nombre || m.tipoMovimiento?.codigo || '-';
    }

    getEstadoNombre(m: MovimientoStock): string {
        return m.estado?.nombre || m.estado?.codigo || '-';
    }

    getEstadoSeverity(codigo: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        if (codigo === 'CONFIRMADO') return 'success';
        if (codigo === 'BORRADOR') return 'warn';
        if (codigo === 'ANULADO') return 'danger';
        return 'secondary';
    }

    cantidadDisplay(m: MovimientoStock): string {
        const q = m.cantidad ?? 0;
        const suma = m.tipoMovimiento?.sumaStock;
        if (suma === true) return `+${q}`;
        if (suma === false) return `-${q}`;
        return String(q);
    }

    confirmarMovimiento(m: MovimientoStock): void {
        if (m.id == null) return;
        this.confirmationService.confirm({
            message: '¿Confirmar este movimiento? Se actualizará el stock.',
            header: 'Confirmar movimiento',
            icon: 'pi pi-check-circle',
            accept: () => {
                this.movimientoStockService.confirmar(m.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Movimiento confirmado' });
                        this.loadMovimientos();
                        this.loadStockActual();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo confirmar.' })
                });
            }
        });
    }

    anularMovimiento(m: MovimientoStock): void {
        if (m.id == null) return;
        this.confirmationService.confirm({
            message: '¿Anular este movimiento? Se revertirá el efecto en el stock.',
            header: 'Anular movimiento',
            icon: 'pi pi-times-circle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.movimientoStockService.anular(m.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Movimiento anulado' });
                        this.loadMovimientos();
                        this.loadStockActual();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo anular.' })
                });
            }
        });
    }

    depositoOpts(): { label: string; value: number | null }[] {
        const base: { label: string; value: number | null }[] = [{ label: 'Todos los depósitos', value: null }];
        const opts = (this.depositos || []).map((d) => ({ label: d.nombre || d.codigo || `#${d.id}`, value: d.id! }));
        return base.concat(opts);
    }

    productoOpts(): { label: string; value: number | null }[] {
        const base: { label: string; value: number | null }[] = [{ label: 'Todos los productos', value: null }];
        const opts = (this.productos || []).map((p) => ({ label: `${p.nombre || p.codigo} (${p.codigo || p.id})`, value: p.id ?? null }));
        return base.concat(opts);
    }

    // --- Carga rápida / Ajuste inventario ---

    keyAjuste(row: StockActual): string {
        const dep = row.depositoId ?? row.deposito?.id;
        const prod = row.productoId ?? row.producto?.id;
        return `${dep}-${prod}`;
    }

    getCantidadContada(row: StockActual): number | null {
        const v = this.cantidadContada()[this.keyAjuste(row)];
        return v !== undefined ? v : null;
    }

    setCantidadContada(row: StockActual, value: number | null): void {
        const key = this.keyAjuste(row);
        this.cantidadContada.update((m) => {
            const next = { ...m };
            if (value === null || value === undefined) delete next[key];
            else next[key] = value;
            return next;
        });
    }

    diferenciaAjuste(row: StockActual): number | null {
        const contada = this.getCantidadContada(row);
        if (contada === null || contada === undefined) return null;
        const actual = row.cantidad ?? 0;
        return contada - actual;
    }

    tieneAjustePendiente(row: StockActual): boolean {
        const d = this.diferenciaAjuste(row);
        return d != null && d !== 0;
    }

    hayAjustesPendientes(): boolean {
        return this.stockParaAjuste().some((r) => this.tieneAjustePendiente(r));
    }

    cargarStockParaAjuste(): void {
        if (this.cargaRapidaDepositoId == null) {
            this.messageService.add({ severity: 'warn', summary: 'Depósito', detail: 'Seleccioná un depósito.' });
            return;
        }
        this.loadingCargaRapida.set(true);
        this.cantidadContada.set({});
        this.stockActualService.listPorDeposito(this.cargaRapidaDepositoId).subscribe({
            next: (list) => {
                this.stockParaAjuste.set(list ?? []);
                this.loadingCargaRapida.set(false);
            },
            error: () => {
                this.stockParaAjuste.set([]);
                this.loadingCargaRapida.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el stock.' });
            }
        });
    }

    aplicarAjuste(row: StockActual): void {
        const diff = this.diferenciaAjuste(row);
        if (diff == null || diff === 0) return;
        const depositoId = row.depositoId ?? row.deposito?.id;
        const productoId = row.productoId ?? row.producto?.id;
        if (depositoId == null || productoId == null || !this.estadoBorrador?.id) return;
        const sumaStock = diff > 0;
        const tipo = (this.tiposMovimiento || []).find((t) =>
            sumaStock ? t.codigo === 'AJUSTE_ENTRADA' : t.codigo === 'AJUSTE_SALIDA'
        );
        if (!tipo?.id) {
            this.messageService.add({ severity: 'warn', summary: 'Configuración', detail: 'Faltan tipos de movimiento AJUSTE_ENTRADA / AJUSTE_SALIDA.' });
            return;
        }
        const cantidad = Math.abs(diff);
        const mov: MovimientoStock = {
            deposito: { id: depositoId },
            producto: { id: productoId },
            tipoMovimiento: { id: tipo.id },
            estado: { id: this.estadoBorrador.id },
            cantidad,
            fechaMovimiento: new Date().toISOString().slice(0, 10),
            numeroReferencia: `INV-${new Date().toISOString().slice(0, 10)}`,
            observacion: 'Ajuste por inventario físico'
        };
        const key = this.keyAjuste(row);
        this.aplicandoId.set(key);
        this.movimientoStockService.create(mov).subscribe({
            next: (created) => {
                if (created.id != null) {
                    this.movimientoStockService.confirmar(created.id).subscribe({
                        next: () => {
                            this.aplicandoId.set(null);
                            this.setCantidadContada(row, null);
                            this.messageService.add({ severity: 'success', summary: 'Ajuste aplicado', detail: this.getProductoNombre(row.producto) + ': stock actualizado.' });
                            this.cargarStockParaAjuste();
                            this.loadStockActual();
                            this.loadMovimientos();
                        },
                        error: (err) => {
                            this.aplicandoId.set(null);
                            this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo confirmar el movimiento.' });
                        }
                    });
                } else {
                    this.aplicandoId.set(null);
                }
            },
            error: (err) => {
                this.aplicandoId.set(null);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo crear el movimiento.' });
            }
        });
    }

    aplicarTodosLosAjustes(): void {
        const list = this.stockParaAjuste().filter((r) => this.tieneAjustePendiente(r));
        if (list.length === 0) {
            this.messageService.add({ severity: 'info', summary: 'Sin cambios', detail: 'No hay líneas con cantidad contada distinta al stock.' });
            return;
        }
        this.confirmationService.confirm({
            message: `Se aplicarán ${list.length} ajuste(s). El stock se actualizará de inmediato. ¿Continuar?`,
            header: 'Aplicar todos los ajustes',
            icon: 'pi pi-check-circle',
            accept: () => {
                let done = 0;
                let failed = 0;
                const process = (index: number) => {
                    if (index >= list.length) {
                        this.messageService.add({
                            severity: failed > 0 ? 'warn' : 'success',
                            summary: 'Ajustes',
                            detail: `${done} aplicados.${failed > 0 ? ' ' + failed + ' fallaron.' : ''}`
                        });
                        this.cargarStockParaAjuste();
                        this.loadStockActual();
                        this.loadMovimientos();
                        return;
                    }
                    const row = list[index];
                    const diff = this.diferenciaAjuste(row)!;
                    const depositoId = row.depositoId ?? row.deposito?.id;
                    const productoId = row.productoId ?? row.producto?.id;
                    if (depositoId == null || productoId == null || !this.estadoBorrador?.id) {
                        failed++;
                        process(index + 1);
                        return;
                    }
                    const sumaStock = diff > 0;
                    const tipo = this.tiposMovimiento.find((t) =>
                        sumaStock ? t.codigo === 'AJUSTE_ENTRADA' : t.codigo === 'AJUSTE_SALIDA'
                    );
                    if (!tipo?.id) {
                        failed++;
                        process(index + 1);
                        return;
                    }
                    const mov: MovimientoStock = {
                        deposito: { id: depositoId },
                        producto: { id: productoId },
                        tipoMovimiento: { id: tipo.id },
                        estado: { id: this.estadoBorrador.id },
                        cantidad: Math.abs(diff),
                        fechaMovimiento: new Date().toISOString().slice(0, 10),
                        numeroReferencia: `INV-${new Date().toISOString().slice(0, 10)}`,
                        observacion: 'Ajuste por inventario físico'
                    };
                    this.movimientoStockService.create(mov).subscribe({
                        next: (created) => {
                            if (created.id != null) {
                                this.movimientoStockService.confirmar(created.id).subscribe({
                                    next: () => {
                                        done++;
                                        this.setCantidadContada(row, null);
                                        process(index + 1);
                                    },
                                    error: () => {
                                        failed++;
                                        process(index + 1);
                                    }
                                });
                            } else process(index + 1);
                        },
                        error: () => {
                            failed++;
                            process(index + 1);
                        }
                    });
                };
                process(0);
            }
        });
    }
}
