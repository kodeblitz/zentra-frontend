import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PresupuestoService, Presupuesto, PresupuestoDetalle } from '../../service/presupuesto.service';
import { ClienteService } from '../../service/cliente.service';

const ESTADOS: { label: string; value: string }[] = [
    { label: 'Borrador', value: 'BORRADOR' },
    { label: 'Enviado', value: 'ENVIADO' },
    { label: 'Aprobado', value: 'APROBADO' },
    { label: 'Rechazado', value: 'RECHAZADO' },
    { label: 'Convertido', value: 'CONVERTIDO' }
];

@Component({
    selector: 'app-presupuesto-ver',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ButtonModule,
        TagModule,
        TableModule,
        ToastModule,
        ConfirmDialogModule
    ],
    templateUrl: './presupuesto-ver.component.html',
    styleUrls: ['./presupuesto-ver.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class PresupuestoVerComponent implements OnInit {
    presupuesto = signal<Presupuesto | null>(null);
    clienteNombre = signal<string>('');
    loading = signal(true);
    exportandoPdf = signal(false);
    id: number | null = null;

    readonly estadosOpt = ESTADOS;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private presupuestoService: PresupuestoService,
        private clienteService: ClienteService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
            this.id = +idParam;
            this.load();
        } else {
            this.router.navigate(['/pages/presupuestos']);
        }
    }

    load(): void {
        if (!this.id) return;
        this.loading.set(true);
        this.presupuestoService.getById(this.id).subscribe({
            next: (p) => {
                this.presupuesto.set(p);
                const clienteId = p.cliente?.id;
                if (clienteId) {
                    this.clienteService.getById(clienteId).subscribe({
                        next: (c) => this.clienteNombre.set(c.razonSocial ?? ''),
                        error: () => this.clienteNombre.set(String(clienteId))
                    });
                } else {
                    this.clienteNombre.set('-');
                }
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el presupuesto.' });
                this.loading.set(false);
            }
        });
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

    getDescripcionLinea(line: PresupuestoDetalle): string {
        if (line.descripcion && line.descripcion.trim()) return line.descripcion;
        const prod = line.producto as unknown as { nombre?: string };
        return prod?.nombre ?? '-';
    }

    exportarPdf(): void {
        if (!this.id) return;
        this.exportandoPdf.set(true);
        this.presupuestoService.exportarPdf(this.id).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const p = this.presupuesto();
                a.download = `presupuesto-${p?.numero ?? this.id}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
                this.exportandoPdf.set(false);
                this.messageService.add({ severity: 'success', summary: 'PDF', detail: 'Descarga iniciada.' });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo generar el PDF.' });
                this.exportandoPdf.set(false);
            }
        });
    }

    enviar(): void {
        if (!this.id) return;
        this.confirmationService.confirm({
            message: '¿Enviar este presupuesto al cliente? (cambiará a estado Enviado).',
            header: 'Enviar presupuesto',
            icon: 'pi pi-send',
            accept: () => {
                this.presupuestoService.enviar(this.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Enviado', detail: 'Presupuesto marcado como enviado.' });
                        this.load();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo enviar.' })
                });
            }
        });
    }

    aprobar(): void {
        if (!this.id) return;
        this.confirmationService.confirm({
            message: '¿Marcar como aprobado por el cliente?',
            header: 'Aprobar presupuesto',
            icon: 'pi pi-check',
            accept: () => {
                this.presupuestoService.aprobar(this.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Aprobado', detail: 'Podés convertirlo en pedido.' });
                        this.load();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo aprobar.' })
                });
            }
        });
    }

    rechazar(): void {
        if (!this.id) return;
        this.confirmationService.confirm({
            message: '¿Marcar como rechazado?',
            header: 'Rechazar presupuesto',
            icon: 'pi pi-times',
            accept: () => {
                this.presupuestoService.rechazar(this.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'info', summary: 'Rechazado', detail: '' });
                        this.load();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo rechazar.' })
                });
            }
        });
    }

    convertirAPedido(): void {
        if (!this.id) return;
        this.confirmationService.confirm({
            message: '¿Convertir este presupuesto en pedido? Se creará un pedido en estado PENDIENTE que luego podés confirmar y facturar.',
            header: 'Convertir a pedido',
            icon: 'pi pi-truck',
            accept: () => {
                this.presupuestoService.convertirAPedido(this.id!).subscribe({
                    next: (pedido) => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Pedido creado',
                            detail: pedido.numero ? `Pedido ${pedido.numero} creado.` : 'Pedido creado.'
                        });
                        this.load();
                        if (pedido.id) this.router.navigate(['/pages/pedidos']);
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo convertir.' })
                });
            }
        });
    }

    irAPedido(): void {
        this.router.navigate(['/pages/pedidos']);
    }

    editar(): void {
        const p = this.presupuesto();
        if (p?.estado !== 'BORRADOR') return;
        if (p?.id) this.router.navigate(['/pages/presupuestos/editar', p.id]);
    }

    volver(): void {
        this.router.navigate(['/pages/presupuestos']);
    }
}
