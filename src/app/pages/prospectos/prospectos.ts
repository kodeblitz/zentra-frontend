import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProspectoService, Prospecto } from '../service/prospecto.service';

const ESTADOS = [
    { label: 'Lead', value: 'LEAD' },
    { label: 'Calificado', value: 'CALIFICADO' },
    { label: 'Ganado', value: 'GANADO' },
    { label: 'Perdido', value: 'PERDIDO' }
];

@Component({
    selector: 'app-prospectos',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        DialogModule,
        SelectModule,
        ToastModule,
        ToolbarModule,
        ConfirmDialogModule,
        IconFieldModule,
        InputIconModule,
        TagModule
    ],
    templateUrl: './prospectos.component.html',
    styleUrls: ['./prospectos.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class ProspectosComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    prospectos = signal<Prospecto[]>([]);
    estadosOpt = ESTADOS;
    filterEstado: string | null = null;
    dialog = false;
    editing = false;
    submitted = false;
    prospecto: Prospecto = {};
    loading = signal(false);

    constructor(
        private prospectoService: ProspectoService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        const req = this.filterEstado
            ? this.prospectoService.listPorEstado(this.filterEstado)
            : this.prospectoService.list();
        req.subscribe({
            next: (list) => {
                this.prospectos.set(list ?? []);
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

    getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (estado) {
            case 'GANADO': return 'success';
            case 'PERDIDO': return 'danger';
            case 'CALIFICADO': return 'info';
            default: return 'secondary';
        }
    }

    puedeConvertir(row: Prospecto): boolean {
        return (row.estado === 'LEAD' || row.estado === 'CALIFICADO') && !row.cliente?.id;
    }

    openNew(): void {
        this.prospecto = { estado: 'LEAD' };
        this.editing = false;
        this.submitted = false;
        this.dialog = true;
    }

    edit(row: Prospecto): void {
        this.prospecto = { ...row };
        this.editing = true;
        this.submitted = false;
        this.dialog = true;
    }

    hideDialog(): void {
        this.dialog = false;
        this.submitted = false;
    }

    onDialogHide(): void {
        this.prospecto = {};
    }

    save(): void {
        this.submitted = true;
        if (!this.prospecto.nombreRazonSocial?.trim()) return;
        const req = this.editing && this.prospecto.id
            ? this.prospectoService.update(this.prospecto)
            : this.prospectoService.create(this.prospecto);
        req.subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: this.editing ? 'Prospecto actualizado.' : 'Prospecto creado.' });
                this.hideDialog();
                this.load();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar.' });
            }
        });
    }

    convertirACliente(row: Prospecto): void {
        if (!row.id) return;
        this.confirmationService.confirm({
            message: `¿Convertir el prospecto "${row.nombreRazonSocial}" en cliente?`,
            header: 'Confirmar',
            icon: 'pi pi-user-plus',
            accept: () => {
                this.prospectoService.convertirACliente(row.id!).subscribe({
                    next: (cliente) => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: `Cliente creado: ${cliente.razonSocial ?? cliente.id}.`
                        });
                        this.load();
                    },
                    error: (err) => {
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo convertir.' });
                    }
                });
            }
        });
    }

    confirmDelete(row: Prospecto): void {
        this.confirmationService.confirm({
            message: `¿Eliminar el prospecto "${row.nombreRazonSocial}"?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(row.id!)
        });
    }

    delete(id: number): void {
        this.prospectoService.delete(id).subscribe({
            next: () => {
                this.prospectos.set(this.prospectos().filter((p) => p.id !== id));
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Prospecto eliminado.' });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar.' });
            }
        });
    }
}
