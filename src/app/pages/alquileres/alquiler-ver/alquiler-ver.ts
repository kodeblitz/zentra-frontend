import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AlquilerService, Alquiler, AlquilerDetalle } from '../../service/alquiler.service';

@Component({
    selector: 'app-alquiler-ver',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        TagModule,
        TableModule,
        ToastModule,
        CardModule,
        ConfirmDialogModule
    ],
    templateUrl: './alquiler-ver.component.html',
    styleUrls: ['./alquiler-ver.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class AlquilerVerComponent implements OnInit {
    alquiler = signal<Alquiler | null>(null);
    loading = signal(true);
    generandoFactura = signal(false);
    id: number | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private alquilerService: AlquilerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
            this.id = +idParam;
            this.load();
        } else {
            this.router.navigate(['/pages/alquileres']);
        }
    }

    load(): void {
        if (!this.id) return;
        this.loading.set(true);
        this.alquilerService.getById(this.id).subscribe({
            next: (a) => {
                this.alquiler.set(a);
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el alquiler.' });
                this.loading.set(false);
            }
        });
    }

    getClienteNombre(a: Alquiler | null): string {
        const cl = a?.cliente as { id?: number; razonSocial?: string } | undefined;
        return cl?.razonSocial ?? (cl?.id != null ? String(cl.id) : '—');
    }

    getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (estado === 'DEVUELTO') return 'success';
        if (estado === 'ENTREGADO') return 'info';
        if (estado === 'CONFIRMADO') return 'info';
        if (estado === 'CANCELADO') return 'danger';
        return 'secondary';
    }

    getDescripcionLinea(line: AlquilerDetalle): string {
        if (line.descripcion && String(line.descripcion).trim()) return line.descripcion;
        const prod = line.producto as unknown as { nombre?: string };
        return prod?.nombre ?? '—';
    }

    volver(): void {
        this.router.navigate(['/pages/alquileres']);
    }

    verFactura(): void {
        const doc = this.alquiler()?.documentoVenta;
        if (doc?.id) this.router.navigate(['/pages/documentos-venta/ver', doc.id]);
    }

    generarFactura(): void {
        if (!this.id) return;
        this.generandoFactura.set(true);
        this.alquilerService.generarFactura(this.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Factura generada', detail: 'La factura en borrador está lista. Se emitirá al entregar el alquiler.' });
                this.generandoFactura.set(false);
                this.load();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'No se pudo generar la factura.' });
                this.generandoFactura.set(false);
            }
        });
    }

    confirmar(): void {
        if (!this.id) return;
        this.confirmationService.confirm({
            message: '¿Confirmar este alquiler?',
            header: 'Confirmar alquiler',
            icon: 'pi pi-check-circle',
            accept: () => {
                this.alquilerService.confirmar(this.id!).subscribe({
                    next: () => { this.messageService.add({ severity: 'success', summary: 'Confirmado', detail: 'Alquiler confirmado.' }); this.load(); },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo confirmar.' })
                });
            }
        });
    }

    entregar(): void {
        if (!this.id) return;
        this.confirmationService.confirm({
            message: '¿Marcar como entregado (productos entregados al cliente)?',
            header: 'Entregar',
            icon: 'pi pi-truck',
            accept: () => {
                this.alquilerService.entregar(this.id!).subscribe({
                    next: () => { this.messageService.add({ severity: 'success', summary: 'Entregado', detail: 'Alquiler marcado como entregado.' }); this.load(); },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo registrar.' })
                });
            }
        });
    }

    devolver(): void {
        if (!this.id) return;
        this.confirmationService.confirm({
            message: '¿Registrar devolución de los productos?',
            header: 'Devolución',
            icon: 'pi pi-undo',
            accept: () => {
                this.alquilerService.devolver(this.id!).subscribe({
                    next: () => { this.messageService.add({ severity: 'success', summary: 'Devuelto', detail: 'Alquiler marcado como devuelto.' }); this.load(); },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo registrar.' })
                });
            }
        });
    }

    cancelar(): void {
        if (!this.id) return;
        this.confirmationService.confirm({
            message: '¿Cancelar este alquiler?',
            header: 'Cancelar alquiler',
            icon: 'pi pi-times-circle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.alquilerService.cancelar(this.id!).subscribe({
                    next: () => { this.messageService.add({ severity: 'success', summary: 'Cancelado', detail: 'Alquiler cancelado.' }); this.volver(); },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo cancelar.' })
                });
            }
        });
    }
}
