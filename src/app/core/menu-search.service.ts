import { Injectable, computed } from '@angular/core';
import { FeatureFlagsService } from './feature-flags.service';

export interface MenuSearchItem {
    label: string;
    routerLink: string[];
    icon: string;
    shortcut?: string;
}

/** Lista fija de ítems del menú con atajos opcionales. Orden: Home primero, luego Zentra. */
const MENU_ITEMS_WITH_FEATURES: Array<{
    label: string;
    routerLink: string[];
    icon: string;
    shortcut?: string;
    feature?: string;
}> = [
    { label: 'Dashboard', routerLink: ['/'], icon: 'pi pi-fw pi-home', shortcut: 'Alt+D' },
    { label: 'Clientes', routerLink: ['/pages/clientes'], icon: 'pi pi-fw pi-users', feature: 'clientes' },
    { label: 'Prospectos', routerLink: ['/pages/prospectos'], icon: 'pi pi-fw pi-user-plus', feature: 'prospectos' },
    { label: 'Documentos de venta', routerLink: ['/pages/documentos-venta'], icon: 'pi pi-fw pi-file-edit', feature: 'documentos_venta' },
    { label: 'Punto de venta (PDV)', routerLink: ['/pages/pdv'], icon: 'pi pi-fw pi-shopping-cart', shortcut: 'Alt+P', feature: 'pdv' },
    { label: 'Presupuestos', routerLink: ['/pages/presupuestos'], icon: 'pi pi-fw pi-file', feature: 'presupuestos' },
    { label: 'Pedidos (delivery)', routerLink: ['/pages/pedidos'], icon: 'pi pi-fw pi-truck', feature: 'pedidos' },
    { label: 'Alquileres', routerLink: ['/pages/alquileres'], icon: 'pi pi-fw pi-calendar', feature: 'alquileres' },
    { label: 'Devoluciones', routerLink: ['/pages/devoluciones'], icon: 'pi pi-fw pi-undo', feature: 'devoluciones' },
    { label: 'Créditos', routerLink: ['/pages/creditos'], icon: 'pi pi-fw pi-credit-card', feature: 'creditos' },
    { label: 'Pagos / Cobranzas', routerLink: ['/pages/pagos'], icon: 'pi pi-fw pi-wallet', feature: 'pagos' },
    { label: 'Caja (efectivo)', routerLink: ['/pages/caja'], icon: 'pi pi-fw pi-money-bill', feature: 'caja' },
    { label: 'Cartera', routerLink: ['/pages/cartera'], icon: 'pi pi-fw pi-chart-line', feature: 'cartera' },
    { label: 'Productos / Servicios', routerLink: ['/pages/productos'], icon: 'pi pi-fw pi-box', feature: 'productos' },
    { label: 'Visor de precios', routerLink: ['/pages/productos/visor-precios'], icon: 'pi pi-fw pi-qrcode', feature: 'productos' },
    { label: 'Inventario', routerLink: ['/pages/inventario'], icon: 'pi pi-fw pi-box', feature: 'inventario' },
    { label: 'Paramétricos', routerLink: ['/pages/parametricos'], icon: 'pi pi-fw pi-sliders-h', feature: 'parametricos' },
    { label: 'Importación masiva', routerLink: ['/pages/importacion'], icon: 'pi pi-fw pi-upload', feature: 'parametricos' },
    { label: 'Respaldo y restauración', routerLink: ['/pages/backup'], icon: 'pi pi-fw pi-cloud-download' }
];

@Injectable({ providedIn: 'root' })
export class MenuSearchService {
    constructor(private featureFlagsService: FeatureFlagsService) {}

    /** Lista plana de ítems visibles (respetando feature flags) para buscar y para ayuda de atajos. */
    readonly items = computed((): MenuSearchItem[] => {
        this.featureFlagsService.currentFlags(); // dependencia para reactividad
        const isEnabled = (key: string) => this.featureFlagsService.isEnabled(key);
        return MENU_ITEMS_WITH_FEATURES.filter((it) => !it.feature || isEnabled(it.feature)).map(({ label, routerLink, icon, shortcut }) => ({
            label,
            routerLink,
            icon,
            shortcut
        }));
    });

    /** Filtra ítems por texto (label). */
    filter(query: string): MenuSearchItem[] {
        const q = (query || '').trim().toLowerCase();
        if (!q) return this.items().slice(0, 15);
        return this.items().filter((it) => it.label.toLowerCase().includes(q)).slice(0, 15);
    }

    /** Atajos globales (no por ítem). Ctrl/Cmd y Alt/⌥ para compatibilidad Windows/Linux y Mac. */
    readonly globalShortcuts: Array<{ keys: string; action: string }> = [
        { keys: 'Ctrl+K / ⌘K (Mac)', action: 'Buscar en el menú' },
        { keys: 'Ctrl+B / ⌘B (Mac)', action: 'Ocultar/mostrar menú lateral' },
        { keys: 'Alt+H / ⌥H (Mac)', action: 'Ver atajos de teclado' }
    ];
}
