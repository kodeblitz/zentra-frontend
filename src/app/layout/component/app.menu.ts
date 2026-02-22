import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { FeatureFlagsService } from '../../core/feature-flags.service';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model(); let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    private featureFlags = inject(FeatureFlagsService);

    readonly model = computed((): MenuItem[] => {
        const isEnabled = (key: string) => this.featureFlags.isEnabled(key);
        return [
            {
                label: 'Home',
                items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
            },
            {
                label: 'Zentra',
                icon: 'pi pi-fw pi-briefcase',
                items: [
                    { label: 'Clientes', icon: 'pi pi-fw pi-users', routerLink: ['/pages/clientes'], data: { feature: 'clientes' }, visible: isEnabled('clientes') },
                    { label: 'Prospectos', icon: 'pi pi-fw pi-user-plus', routerLink: ['/pages/prospectos'], data: { feature: 'prospectos' }, visible: isEnabled('prospectos') },
                    { label: 'Documentos de venta', icon: 'pi pi-fw pi-file-edit', routerLink: ['/pages/documentos-venta'], data: { feature: 'documentos_venta' }, visible: isEnabled('documentos_venta') },
                    { label: 'Punto de venta (PDV)', icon: 'pi pi-fw pi-shopping-cart', routerLink: ['/pages/pdv'], data: { feature: 'pdv' }, visible: isEnabled('pdv') },
                    { label: 'Presupuestos', icon: 'pi pi-fw pi-file', routerLink: ['/pages/presupuestos'], data: { feature: 'presupuestos' }, visible: isEnabled('presupuestos') },
                    { label: 'Pedidos (delivery)', icon: 'pi pi-fw pi-truck', routerLink: ['/pages/pedidos'], data: { feature: 'pedidos' }, visible: isEnabled('pedidos') },
                    { label: 'Alquileres', icon: 'pi pi-fw pi-calendar', routerLink: ['/pages/alquileres'], data: { feature: 'alquileres' }, visible: isEnabled('alquileres') },
                    { label: 'Devoluciones', icon: 'pi pi-fw pi-undo', routerLink: ['/pages/devoluciones'], data: { feature: 'devoluciones' }, visible: isEnabled('devoluciones') },
                    { label: 'Créditos', icon: 'pi pi-fw pi-credit-card', routerLink: ['/pages/creditos'], data: { feature: 'creditos' }, visible: isEnabled('creditos') },
                    { label: 'Pagos / Cobranzas', icon: 'pi pi-fw pi-wallet', routerLink: ['/pages/pagos'], data: { feature: 'pagos' }, visible: isEnabled('pagos') },
                    { label: 'Caja (efectivo)', icon: 'pi pi-fw pi-money-bill', routerLink: ['/pages/caja'], data: { feature: 'caja' }, visible: isEnabled('caja') },
                    { label: 'Cartera', icon: 'pi pi-fw pi-chart-line', routerLink: ['/pages/cartera'], data: { feature: 'cartera' }, visible: isEnabled('cartera') },
                    { label: 'Productos / Servicios', icon: 'pi pi-fw pi-box', routerLink: ['/pages/productos'], data: { feature: 'productos' }, visible: isEnabled('productos') },
                    { label: 'Visor de precios', icon: 'pi pi-fw pi-qrcode', routerLink: ['/pages/productos/visor-precios'], data: { feature: 'productos' }, visible: isEnabled('productos') },
                    { label: 'Inventario', icon: 'pi pi-fw pi-box', routerLink: ['/pages/inventario'], data: { feature: 'inventario' }, visible: isEnabled('inventario') },
                    { label: 'Paramétricos', icon: 'pi pi-fw pi-sliders-h', routerLink: ['/pages/parametricos'], data: { feature: 'parametricos' }, visible: isEnabled('parametricos') },
                    { label: 'Importación masiva', icon: 'pi pi-fw pi-upload', routerLink: ['/pages/importacion'], data: { feature: 'parametricos' }, visible: isEnabled('parametricos') },
                    { label: 'Respaldo y restauración', icon: 'pi pi-fw pi-cloud-download', routerLink: ['/pages/backup'] }
                ].filter((it) => it.visible !== false)
            }
        ];
    });
}
