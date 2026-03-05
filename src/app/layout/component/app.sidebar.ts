import { Component, ElementRef } from '@angular/core';
import { AppMenu } from './app.menu';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [AppMenu],
    template: `
        <div class="layout-sidebar">
            <div class="layout-sidebar-menu">
                <app-menu></app-menu>
            </div>
            <div class="layout-footer layout-footer-sidebar">
                ZENTRA by
                <a href="https://primeng.org" target="_blank" rel="noopener noreferrer" class="text-primary font-bold hover:underline">PrimeNG</a>
            </div>
        </div>
    `
})
export class AppSidebar {
    constructor(public el: ElementRef) {}
}
