import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { DocumentoVentaService } from '../service/documento-venta.service';
import { CarteraService } from '../service/cartera.service';
import { PedidoService, Pedido } from '../service/pedido.service';

/** Módulos del ERP en el mismo orden que el menú lateral. */
const MODULOS_ERP: { label: string; icon: string; routerLink: string[] }[] = [
    { label: 'Clientes', icon: 'pi pi-users', routerLink: ['/pages/clientes'] },
    { label: 'Prospectos', icon: 'pi pi-user-plus', routerLink: ['/pages/prospectos'] },
    { label: 'Documentos de venta', icon: 'pi pi-file-edit', routerLink: ['/pages/documentos-venta'] },
    { label: 'Punto de venta (PDV)', icon: 'pi pi-shopping-cart', routerLink: ['/pages/pdv'] },
    { label: 'Pedidos (delivery)', icon: 'pi pi-truck', routerLink: ['/pages/pedidos'] },
    { label: 'Devoluciones', icon: 'pi pi-undo', routerLink: ['/pages/devoluciones'] },
    { label: 'Créditos', icon: 'pi pi-credit-card', routerLink: ['/pages/creditos'] },
    { label: 'Pagos / Cobranzas', icon: 'pi pi-wallet', routerLink: ['/pages/pagos'] },
    { label: 'Caja (efectivo)', icon: 'pi pi-money-bill', routerLink: ['/pages/caja'] },
    { label: 'Cartera', icon: 'pi pi-chart-line', routerLink: ['/pages/cartera'] },
    { label: 'Inventario', icon: 'pi pi-box', routerLink: ['/pages/inventario'] },
    { label: 'Paramétricos', icon: 'pi pi-sliders-h', routerLink: ['/pages/parametricos'] }
];

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, CardModule, SkeletonModule],
    template: `
        <div class="flex flex-col gap-6">
            <header class="flex flex-wrap items-center gap-2">
                <h1 class="m-0 text-2xl font-semibold text-color">Zentra ERP</h1>
                <span class="text-muted-color text-lg">Acceso rápido y resumen del día</span>
            </header>

            <!-- Tarjetas de resumen: ventas del día, cartera, últimos pedidos -->
            <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <p-card header="Ventas del día" styleClass="h-full">
                    @if (loadingResumen()) {
                        <p-skeleton width="100%" height="3rem" />
                    } @else {
                        <div class="flex items-center gap-3">
                            <div class="flex items-center justify-center rounded-full bg-green-100 dark:bg-green-400/20 text-green-600 dark:text-green-400 w-12 h-12 shrink-0">
                                <i class="pi pi-chart-line text-xl"></i>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-color">{{ ventasDelDia() | number:'1.0-0' }}</div>
                                <span class="text-sm text-muted-color">Total facturado hoy (emitidos)</span>
                            </div>
                        </div>
                    }
                </p-card>
                <p-card header="Cartera por cobrar" styleClass="h-full">
                    @if (loadingResumen()) {
                        <p-skeleton width="100%" height="3rem" />
                    } @else {
                        <div class="flex items-center gap-3">
                            <div class="flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-400/20 text-orange-600 dark:text-orange-400 w-12 h-12 shrink-0">
                                <i class="pi pi-wallet text-xl"></i>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-color">{{ carteraTotal() | number:'1.0-0' }}</div>
                                <span class="text-sm text-muted-color">Saldo pendiente de cobro</span>
                            </div>
                        </div>
                    }
                </p-card>
                <p-card header="Últimos pedidos" styleClass="h-full flex flex-col">
                    @if (loadingPedidos()) {
                        <p-skeleton width="100%" height="4rem" />
                        <p-skeleton width="100%" height="2rem" class="mt-2" />
                    } @else {
                        <div class="flex flex-col gap-2 flex-1 min-h-0">
                            @if (ultimosPedidos().length === 0) {
                                <p class="text-muted-color text-sm m-0">No hay pedidos recientes</p>
                            } @else {
                                @for (p of ultimosPedidos(); track p.id) {
                                    <a [routerLink]="['/pages/pedidos']" class="flex justify-between items-center py-2 px-2 rounded-border hover:bg-surface-100 no-underline text-color">
                                        <span class="font-medium truncate">{{ p.numero ?? '#' + p.id }}</span>
                                        <span class="text-muted-color text-sm shrink-0">{{ p.fechaPedido | date:'shortDate' }}</span>
                                    </a>
                                }
                            }
                            <a [routerLink]="['/pages/pedidos']" class="text-primary text-sm font-medium mt-2">Ver todos los pedidos</a>
                        </div>
                    }
                </p-card>
            </section>

            <!-- Acceso rápido a módulos -->
            <section>
                <h2 class="text-xl font-semibold text-color mb-4">Módulos</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                    @for (mod of modulos; track mod.routerLink[0]) {
                        <a [routerLink]="mod.routerLink" class="no-underline block h-full">
                            <p-card styleClass="h-full cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
                                <div class="flex flex-col items-center gap-3 text-center py-2">
                                    <div class="flex items-center justify-center rounded-full bg-primary/10 text-primary w-14 h-14 shrink-0">
                                        <i [class]="mod.icon + ' text-2xl'"></i>
                                    </div>
                                    <span class="font-semibold text-color">{{ mod.label }}</span>
                                    <span class="text-primary text-sm font-medium flex items-center gap-1">
                                        Abrir <i class="pi pi-arrow-right text-xs"></i>
                                    </span>
                                </div>
                            </p-card>
                        </a>
                    }
                </div>
            </section>
        </div>
    `
})
export class Dashboard implements OnInit {
    modulos = MODULOS_ERP;

    ventasDelDia = signal<number>(0);
    carteraTotal = signal<number>(0);
    ultimosPedidos = signal<Pedido[]>([]);
    loadingResumen = signal(true);
    loadingPedidos = signal(true);

    constructor(
        private documentoVentaService: DocumentoVentaService,
        private carteraService: CarteraService,
        private pedidoService: PedidoService
    ) {}

    ngOnInit(): void {
        const hoy = this.hoy();
        forkJoin({
            docs: this.documentoVentaService.listPorFechas(hoy, hoy),
            aging: this.carteraService.aging()
        }).subscribe({
            next: ({ docs, aging }) => {
                const totalVentas = (docs ?? []).filter((d) => d.estado === 'EMITIDO').reduce((s, d) => s + (d.total ?? 0), 0);
                this.ventasDelDia.set(totalVentas);
                this.carteraTotal.set(aging?.total ?? 0);
                this.loadingResumen.set(false);
            },
            error: () => {
                this.ventasDelDia.set(0);
                this.carteraTotal.set(0);
                this.loadingResumen.set(false);
            }
        });
        this.pedidoService.paginate({ page: 0, size: 5, sortBy: 'fechaPedido', sortDir: 'desc' }).subscribe({
            next: (res) => {
                this.ultimosPedidos.set(res?.content ?? []);
                this.loadingPedidos.set(false);
            },
            error: () => {
                this.ultimosPedidos.set([]);
                this.loadingPedidos.set(false);
            }
        });
    }

    private hoy(): string {
        return new Date().toISOString().slice(0, 10);
    }
}
