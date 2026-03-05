import { Component, signal, computed, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProductoService, ProductoVisorPreciosDTO } from '../../service/producto.service';

@Component({
    selector: 'app-visor-precios',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, InputTextModule, ButtonModule, CardModule, ToastModule],
    templateUrl: './visor-precios.component.html',
    styleUrls: ['./visor-precios.component.scss'],
    providers: [MessageService]
})
export class VisorPreciosComponent implements AfterViewInit {
    @ViewChild('inputCodigo') inputCodigo!: ElementRef<HTMLInputElement>;

    codigo = '';
    producto = signal<ProductoVisorPreciosDTO | null>(null);
    loading = signal(false);
    notFound = signal(false);

    constructor(
        private productoService: ProductoService,
        private messageService: MessageService
    ) {}

    ngAfterViewInit(): void {
        this.focusInput();
    }

    focusInput(): void {
        setTimeout(() => this.inputCodigo?.nativeElement?.focus(), 100);
    }

    consultar(): void {
        const v = this.codigo?.trim();
        if (!v) {
            this.messageService.add({ severity: 'warn', summary: 'Código', detail: 'Ingresá o escaneá un código.' });
            this.focusInput();
            return;
        }
        this.loading.set(true);
        this.notFound.set(false);
        this.producto.set(null);
        this.productoService.visorPrecios(v).subscribe({
            next: (p) => {
                this.loading.set(false);
                if (p) {
                    this.producto.set(p);
                    this.notFound.set(false);
                } else {
                    this.notFound.set(true);
                    this.messageService.add({ severity: 'info', summary: 'No encontrado', detail: 'No hay producto con ese código.' });
                }
                this.focusInput();
            },
            error: () => {
                this.loading.set(false);
                this.notFound.set(true);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo consultar.' });
                this.focusInput();
            }
        });
    }

    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.consultar();
        }
    }

    limpiar(): void {
        this.codigo = '';
        this.producto.set(null);
        this.notFound.set(false);
        this.focusInput();
    }

    /** Precios mayoristas por rango (solo los definidos). */
    rangosMayorista(p: ProductoVisorPreciosDTO | null): { desde: number; precio: number }[] {
        if (!p) return [];
        const out: { desde: number; precio: number }[] = [];
        const precios: (number | undefined)[] = [p.precioMayorista5, p.precioMayorista10, p.precioMayorista20, p.precioMayorista50, p.precioMayorista100];
        const rangos = [5, 10, 20, 50, 100];
        rangos.forEach((desde, i) => {
            const precio = precios[i];
            if (precio != null && precio > 0) out.push({ desde, precio });
        });
        return out;
    }

    /** Rangos del producto actual (computed para no llamar varias veces en el template). */
    rangosActuales = computed(() => this.rangosMayorista(this.producto()));

    /** Si tiene precio mayorista único o rangos. */
    tienePreciosMayoristas = computed(() => {
        const p = this.producto();
        if (!p) return false;
        if ((p.precioMayorista ?? 0) > 0) return true;
        return this.rangosMayorista(p).length > 0;
    });
}
