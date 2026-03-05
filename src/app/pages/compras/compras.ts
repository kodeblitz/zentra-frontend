import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
import { CompraService, Compra } from '../service/compra.service';

const ESTADOS = [
    { label: 'Borrador', value: 'BORRADOR' },
    { label: 'Confirmado', value: 'CONFIRMADO' },
    { label: 'Recibido', value: 'RECIBIDO' },
    { label: 'Cancelado', value: 'CANCELADO' }
];

@Component({
    selector: 'app-compras',
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
    templateUrl: './compras.component.html',
    styleUrls: ['./compras.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class ComprasComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    compras = signal<Compra[]>([]);
    filterEstado: string | null = null;
    estadosOpt = [{ label: 'Todos', value: null }, ...ESTADOS];
    loading = signal(false);
    proveedorNombreCache: Record<number, string> = {};

    constructor(
        private compraService: CompraService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        const req = this.filterEstado
            ? this.compraService.listPorEstado(this.filterEstado)
            : this.compraService.list();
        req.subscribe({
            next: (list) => {
                this.compras.set(list ?? []);
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

    getEstadoLabel(estado: string | undefined): string {
        const e = ESTADOS.find((x) => x.value === estado);
        return e?.label ?? estado ?? '-';
    }

    getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (estado === 'RECIBIDO') return 'success';
        if (estado === 'CONFIRMADO') return 'info';
        if (estado === 'CANCELADO') return 'danger';
        return 'secondary';
    }

    getProveedorNombre(compra: Compra): string {
        const id = compra.proveedor?.id;
        if (id == null) return '-';
        const p = (compra.proveedor as { razonSocial?: string })?.razonSocial;
        if (p) return p;
        return this.proveedorNombreCache[id] ?? `#${id}`;
    }

    ver(row: Compra): void {
        if (row.id) window.location.hash = ''; // trigger navigation
    }

    editar(row: Compra): void {
        if (row.id) window.location.hash = ''; // will use routerLink
    }

    confirmDelete(row: Compra): void {
        this.confirmationService.confirm({
            message: `¿Eliminar la compra ${row.numero || row.id}? Solo se pueden eliminar compras en borrador.`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(row.id!)
        });
    }

    delete(id: number): void {
        this.compraService.delete(id).subscribe({
            next: () => {
                this.compras.set(this.compras().filter((c) => c.id !== id));
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Compra eliminada.' });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar.' });
            }
        });
    }
}
