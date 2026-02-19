import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CreditoService, Credito } from '../service/credito.service';

@Component({
    selector: 'app-creditos',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        ToastModule,
        ToolbarModule,
        ConfirmDialogModule,
        IconFieldModule,
        InputIconModule,
        TagModule
    ],
    templateUrl: './creditos.component.html',
    styleUrls: ['./creditos.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class CreditosComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    creditos = signal<Credito[]>([]);
    clienteNombreCache: Record<number, string> = {};
    loading = signal(false);

    constructor(
        private creditoService: CreditoService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.creditoService.list().subscribe({
            next: (list) => {
                const items = list ?? [];
                this.creditos.set(items);
                items.forEach((c) => {
                    const cliente = c.cliente as unknown as { id?: number; razonSocial?: string };
                    if (cliente?.id != null && cliente.razonSocial != null)
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

    getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (estado === 'VIGENTE') return 'info';
        if (estado === 'CANCELADO') return 'danger';
        if (estado === 'PAGADO') return 'success';
        return 'secondary';
    }

    openNew(): void {
        this.router.navigate(['/pages/creditos/nuevo']);
    }

    verDetalle(row: Credito): void {
        this.router.navigate(['/pages/creditos/ver', row.id]);
    }

    recalcular(row: Credito): void {
        this.confirmationService.confirm({
            message: '¿Recalcular cuotas de este crédito?',
            header: 'Confirmar',
            icon: 'pi pi-question-circle',
            accept: () => {
                this.creditoService.recalcularEstado(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Recalculado', detail: 'Estado del crédito actualizado.' });
                        this.load();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo recalcular.' })
                });
            }
        });
    }
}
