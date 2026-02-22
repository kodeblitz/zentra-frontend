import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AlquilerService, Alquiler } from '../service/alquiler.service';

@Component({
    selector: 'app-alquileres',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        ToastModule,
        ToolbarModule,
        ConfirmDialogModule,
        IconFieldModule,
        InputIconModule,
        TagModule,
        TooltipModule
    ],
    templateUrl: './alquileres.component.html',
    styleUrls: ['./alquileres.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class AlquileresComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    alquileres = signal<Alquiler[]>([]);
    clienteNombreCache: Record<number, string> = {};
    loading = signal(false);

    constructor(
        private alquilerService: AlquilerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.alquilerService.list().subscribe({
            next: (list) => {
                const items = list ?? [];
                this.alquileres.set(items);
                items.forEach((a) => {
                    const cl = a.cliente as unknown as { id?: number; razonSocial?: string };
                    if (cl?.id != null && cl.razonSocial != null)
                        this.clienteNombreCache[cl.id] = cl.razonSocial;
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

    irAPdv(): void {
        this.router.navigate(['/pages/pdv']);
    }

    getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (estado === 'DEVUELTO') return 'success';
        if (estado === 'ENTREGADO') return 'info';
        if (estado === 'CONFIRMADO') return 'info';
        if (estado === 'CANCELADO') return 'danger';
        return 'secondary';
    }

    ver(row: Alquiler): void {
        if (row.id) this.router.navigate(['/pages/alquileres/ver', row.id]);
    }

    confirmar(row: Alquiler): void {
        if (!row.id) return;
        this.confirmationService.confirm({
            message: '¿Confirmar este alquiler?',
            header: 'Confirmar alquiler',
            icon: 'pi pi-check-circle',
            accept: () => {
                this.alquilerService.confirmar(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Confirmado', detail: 'Alquiler confirmado.' });
                        this.load();
                    },
                    error: (err) =>
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo confirmar.' })
                });
            }
        });
    }

    entregar(row: Alquiler): void {
        if (!row.id) return;
        this.confirmationService.confirm({
            message: '¿Marcar como entregado (productos entregados al cliente)?',
            header: 'Entregar',
            icon: 'pi pi-truck',
            accept: () => {
                this.alquilerService.entregar(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Entregado', detail: 'Alquiler marcado como entregado.' });
                        this.load();
                    },
                    error: (err) =>
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo registrar.' })
                });
            }
        });
    }

    devolver(row: Alquiler): void {
        if (!row.id) return;
        this.confirmationService.confirm({
            message: '¿Registrar devolución de los productos?',
            header: 'Devolución',
            icon: 'pi pi-undo',
            accept: () => {
                this.alquilerService.devolver(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Devuelto', detail: 'Alquiler marcado como devuelto.' });
                        this.load();
                    },
                    error: (err) =>
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo registrar.' })
                });
            }
        });
    }

    cancelar(row: Alquiler): void {
        if (!row.id) return;
        this.confirmationService.confirm({
            message: '¿Cancelar este alquiler?',
            header: 'Cancelar alquiler',
            icon: 'pi pi-times-circle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.alquilerService.cancelar(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Cancelado', detail: 'Alquiler cancelado.' });
                        this.load();
                    },
                    error: (err) =>
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo cancelar.' })
                });
            }
        });
    }
}
