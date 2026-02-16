import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'Home',
                items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
            },
            {
                label: 'Zentra',
                icon: 'pi pi-fw pi-briefcase',
                items: [
                    { label: 'Clientes', icon: 'pi pi-fw pi-users', routerLink: ['/pages/clientes'] },
                    { label: 'Prospectos', icon: 'pi pi-fw pi-user-plus', routerLink: ['/pages/prospectos'] },
                    { label: 'Documentos de venta', icon: 'pi pi-fw pi-file-edit', routerLink: ['/pages/documentos-venta'] },
                    { label: 'Punto de venta (PDV)', icon: 'pi pi-fw pi-shopping-cart', routerLink: ['/pages/pdv'] },
                    { label: 'Presupuestos', icon: 'pi pi-fw pi-file', routerLink: ['/pages/presupuestos'] },
                    { label: 'Pedidos (delivery)', icon: 'pi pi-fw pi-truck', routerLink: ['/pages/pedidos'] },
                    { label: 'Devoluciones', icon: 'pi pi-fw pi-undo', routerLink: ['/pages/devoluciones'] },
                    { label: 'Créditos', icon: 'pi pi-fw pi-credit-card', routerLink: ['/pages/creditos'] },
                    { label: 'Pagos / Cobranzas', icon: 'pi pi-fw pi-wallet', routerLink: ['/pages/pagos'] },
                    { label: 'Caja (efectivo)', icon: 'pi pi-fw pi-money-bill', routerLink: ['/pages/caja'] },
                    { label: 'Cartera', icon: 'pi pi-fw pi-chart-line', routerLink: ['/pages/cartera'] },
                    { label: 'Productos / Servicios', icon: 'pi pi-fw pi-box', routerLink: ['/pages/productos'] },
                    { label: 'Inventario', icon: 'pi pi-fw pi-box', routerLink: ['/pages/inventario'] },
                    { label: 'Paramétricos', icon: 'pi pi-fw pi-sliders-h', routerLink: ['/pages/parametricos'] }
                ]
            }
        ];
    }
}
