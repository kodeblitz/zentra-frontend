import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
import { PresupuestoService, Presupuesto } from '../service/presupuesto.service';
import { ClienteService } from '../service/cliente.service';

const ESTADOS = [
    { label: 'Borrador', value: 'BORRADOR' },
    { label: 'Enviado', value: 'ENVIADO' },
    { label: 'Aprobado', value: 'APROBADO' },
    { label: 'Rechazado', value: 'RECHAZADO' },
    { label: 'Convertido', value: 'CONVERTIDO' }
];

@Component({
    selector: 'app-presupuestos',
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
    templateUrl: './presupuestos.component.html',
    styleUrls: ['./presupuestos.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class PresupuestosComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    presupuestos = signal<Presupuesto[]>([]);
    clienteNombreCache: Record<number, string> = {};
    estadosOpt = ESTADOS;
    filterEstado: string | null = null;
    loading = signal(false);

    constructor(
        private presupuestoService: PresupuestoService,
        private clienteService: ClienteService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        const req = this.filterEstado
            ? this.presupuestoService.listPorEstado(this.filterEstado)
            : this.presupuestoService.list();
        req.subscribe({
            next: (list) => {
                const items = list ?? [];
                this.presupuestos.set(items);
                items.forEach((p) => {
                    const cliente = p.cliente as unknown as { id?: number; razonSocial?: string };
                    if (cliente?.id && cliente.razonSocial)
                        this.clienteNombreCache[cliente.id] = cliente.razonSocial;
                });
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar.' });
                this.loading.set(false);
            }
        });
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    getClienteNombre(id: number | undefined): string {
        if (id == null) return '-';
        return this.clienteNombreCache[id] ?? String(id);
    }

    getEstadoLabel(estado: string | undefined): string {
        const e = ESTADOS.find((x) => x.value === estado);
        return e?.label ?? estado ?? '-';
    }

    getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (estado) {
            case 'CONVERTIDO': return 'success';
            case 'APROBADO': return 'success';
            case 'RECHAZADO': return 'danger';
            case 'ENVIADO': return 'info';
            default: return 'secondary';
        }
    }

    ver(row: Presupuesto): void {
        if (row.id) this.router.navigate(['/pages/presupuestos/ver', row.id]);
    }

    editar(row: Presupuesto): void {
        if (row.estado !== 'BORRADOR') {
            this.messageService.add({ severity: 'warn', summary: 'Solo borradores', detail: 'Solo se pueden editar presupuestos en estado BORRADOR.' });
            return;
        }
        if (row.id) this.router.navigate(['/pages/presupuestos/editar', row.id]);
    }

    eliminar(row: Presupuesto): void {
        if (!row.id || row.estado !== 'BORRADOR') return;
        this.confirmationService.confirm({
            message: '¿Eliminar este presupuesto?',
            header: 'Confirmar',
            icon: 'pi pi-trash',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.presupuestoService.delete(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Presupuesto eliminado.' });
                        this.load();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar.' })
                });
            }
        });
    }
}
