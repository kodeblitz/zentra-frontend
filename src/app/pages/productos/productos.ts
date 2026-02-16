import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProductoService } from '../service/producto.service';
import { Producto } from '../service/maestros.service';

@Component({
    selector: 'app-productos',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        ToastModule,
        ToolbarModule,
        ConfirmDialogModule,
        IconFieldModule,
        InputIconModule,
        TagModule
    ],
    templateUrl: './productos.component.html',
    styleUrls: ['./productos.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class ProductosComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    productos = signal<Producto[]>([]);
    loading = signal(false);
    filterTipo: 'todos' | 'producto' | 'servicio' | 'combo' | 'alquilable' = 'todos';
    tipoOpts = [
        { label: 'Todos', value: 'todos' },
        { label: 'Productos', value: 'producto' },
        { label: 'Combos', value: 'combo' },
        { label: 'Alquilables', value: 'alquilable' }
    ];

    constructor(
        private productoService: ProductoService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.productoService.list().subscribe({
            next: (list) => {
                this.productos.set(list ?? []);
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista.' });
                this.loading.set(false);
            }
        });
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    getTipoLabel(p: Producto): string {
        if (p.esCombo) return 'Combo';
        if (p.alquilable) return 'Alquilable';
        return 'Producto';
    }

    getTipoSeverity(p: Producto): 'success' | 'info' | 'warn' | 'secondary' {
        if (p.esCombo) return 'warn';
        if (p.alquilable) return 'info';
        return 'success';
    }

    confirmDelete(row: Producto): void {
        this.confirmationService.confirm({
            message: `¿Eliminar "${row.nombre}"?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(row.id!)
        });
    }

    delete(id: number): void {
        this.productoService.delete(id).subscribe({
            next: () => {
                this.productos.set(this.productos().filter((p) => p.id !== id));
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Producto eliminado.' });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar.' });
            }
        });
    }

    get filteredProductos(): Producto[] {
        const list = this.productos();
        if (this.filterTipo === 'todos') return list;
        if (this.filterTipo === 'combo') return list.filter((p) => p.esCombo);
        if (this.filterTipo === 'alquilable') return list.filter((p) => p.alquilable);
        return list;
    }
}
