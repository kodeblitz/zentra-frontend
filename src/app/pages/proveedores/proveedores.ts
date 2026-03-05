import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProveedorService, Proveedor } from '../service/proveedor.service';

@Component({
    selector: 'app-proveedores',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        DialogModule,
        CheckboxModule,
        ToastModule,
        ToolbarModule,
        ConfirmDialogModule,
        IconFieldModule,
        InputIconModule,
        TagModule
    ],
    templateUrl: './proveedores.component.html',
    styleUrls: ['./proveedores.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class ProveedoresComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    proveedores = signal<Proveedor[]>([]);
    dialog = false;
    editing = false;
    submitted = false;
    proveedor: Proveedor = {};
    loading = signal(false);

    constructor(
        private proveedorService: ProveedorService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.proveedorService.list().subscribe({
            next: (list) => {
                this.proveedores.set(list ?? []);
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

    openNew(): void {
        this.proveedor = { activo: true };
        this.editing = false;
        this.submitted = false;
        this.dialog = true;
    }

    edit(row: Proveedor): void {
        this.proveedor = { ...row };
        this.editing = true;
        this.submitted = false;
        this.dialog = true;
    }

    hideDialog(): void {
        this.dialog = false;
        this.submitted = false;
    }

    onDialogHide(): void {
        this.proveedor = {};
    }

    save(): void {
        this.submitted = true;
        if (!this.proveedor.razonSocial?.trim()) return;
        const req = this.editing && this.proveedor.id
            ? this.proveedorService.update({ ...this.proveedor })
            : this.proveedorService.create(this.proveedor);
        req.subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: this.editing ? 'Proveedor actualizado.' : 'Proveedor creado.' });
                this.hideDialog();
                this.load();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar.' });
            }
        });
    }

    confirmDelete(row: Proveedor): void {
        this.confirmationService.confirm({
            message: `¿Eliminar el proveedor "${row.razonSocial}"?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(row.id!)
        });
    }

    delete(id: number): void {
        this.proveedorService.delete(id).subscribe({
            next: () => {
                this.proveedores.set(this.proveedores().filter((p) => p.id !== id));
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Proveedor eliminado.' });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar.' });
            }
        });
    }
}
