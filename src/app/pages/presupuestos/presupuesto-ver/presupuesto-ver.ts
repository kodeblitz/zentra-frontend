import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PresupuestoService, Presupuesto, PresupuestoDetalle, EnviarPresupuestoDTO } from '../../service/presupuesto.service';
import { ClienteService } from '../../service/cliente.service';
import { celularParaWhatsApp } from '../../../core/telefono.util';

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
        ConfirmDialogModule,
        DialogModule,
        CardModule,
        InputTextModule
    ],
    templateUrl: './presupuesto-ver.component.html',
    styleUrls: ['./presupuesto-ver.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class PresupuestoVerComponent implements OnInit {
    presupuesto = signal<Presupuesto | null>(null);
    clienteNombre = signal<string>('');
    /** Celular del cliente (para WhatsApp). */
    clienteCelular = signal<string | null>(null);
    loading = signal(true);
    exportandoPdf = signal(false);
    id: number | null = null;
    /** Tras enviar: enlace y código para mostrar en diálogo. */
    enviarResultado = signal<EnviarPresupuestoDTO | null>(null);
    /** Visibilidad del diálogo "Enlace para el cliente" (two-way con p-dialog para que la X cierre). */
    dialogEnlaceVisible = false;

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
                        next: (c) => {
                            this.clienteNombre.set(c.razonSocial ?? '');
                            this.clienteCelular.set(c.celular ?? null);
                        },
                        error: () => {
                            this.clienteNombre.set(String(clienteId));
                            this.clienteCelular.set(null);
                        }
                    });
                } else {
                    this.clienteNombre.set('-');
                    this.clienteCelular.set(null);
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
            message: '¿Enviar este presupuesto al cliente? Se generará un enlace y un código de seguridad para que el cliente pueda consultar y aprobar o rechazar.',
            header: 'Enviar presupuesto',
            icon: 'pi pi-send',
            accept: () => {
                this.presupuestoService.enviar(this.id!).subscribe({
                    next: (res) => {
                        this.load();
                        const fullLink = typeof window !== 'undefined' && window.location?.origin
                            ? window.location.origin + (res.link || '')
                            : res.link || '';
                        this.enviarResultado.set({ link: fullLink, codigoSeguridad: res.codigoSeguridad ?? '' });
                        this.dialogEnlaceVisible = true;
                        this.messageService.add({ severity: 'success', summary: 'Enviado', detail: 'Compartí el enlace y el código con el cliente.' });
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo enviar.' })
                });
            }
        });
    }

    get linkEnviado(): string {
        return this.enviarResultado()?.link ?? '';
    }

    get codigoEnviado(): string {
        return this.enviarResultado()?.codigoSeguridad ?? '';
    }

    copiarEnlace(): void {
        const link = this.linkEnviado;
        if (!link) return;
        navigator.clipboard.writeText(link).then(
            () => this.messageService.add({ severity: 'success', summary: 'Copiado', detail: 'Enlace copiado al portapapeles.' }),
            () => this.messageService.add({ severity: 'warn', summary: 'Copiar', detail: 'No se pudo copiar; copiá el enlace manualmente.' })
        );
    }

    cerrarDialogoEnlace(): void {
        this.enviarResultado.set(null);
        this.dialogEnlaceVisible = false;
    }

    /** Abre WhatsApp con el enlace y código ya mostrados en el diálogo (tras Enviar). */
    enviarAWhatsApp(): void {
        const link = this.linkEnviado;
        const codigo = this.codigoEnviado;
        if (!link || !codigo) return;
        const mensaje = 'Hola, te comparto el presupuesto para que lo revises.\n\nPodés verlo, aprobarlo o rechazarlo en este enlace:\n' + link + '\n\nCódigo de seguridad para acceder: ' + codigo;
        const num = celularParaWhatsApp(this.clienteCelular());
        const url = num ? `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}` : 'https://wa.me/?text=' + encodeURIComponent(mensaje);
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    /** Abre WhatsApp con enlace y código (desde vista ver, presupuesto ya enviado). */
    enviarAWhatsAppDesdeVer(): void {
        if (!this.id) return;
        this.presupuestoService.getDatosEnvio(this.id).subscribe({
            next: (dato: EnviarPresupuestoDTO) => {
                const link = typeof window !== 'undefined' && window.location?.origin ? window.location.origin + (dato.link || '') : dato.link || '';
                const codigo = dato.codigoSeguridad ?? '';
                const mensaje = 'Hola, te comparto el presupuesto para que lo revises.\n\nPodés verlo, aprobarlo o rechazarlo en este enlace:\n' + link + '\n\nCódigo de seguridad para acceder: ' + codigo;
                const num = celularParaWhatsApp(this.clienteCelular());
                const url = num ? `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}` : 'https://wa.me/?text=' + encodeURIComponent(mensaje);
                window.open(url, '_blank', 'noopener,noreferrer');
            },
            error: (err: { error?: { message?: string } }) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'No se pudo obtener el enlace.' })
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
            message: '¿Convertir este presupuesto en pedido? Se creará un pedido confirmado y una factura en borrador asociada. Luego podés emitir la factura desde esta misma pantalla o desde Documentos de venta.',
            header: 'Convertir a pedido',
            icon: 'pi pi-truck',
            accept: () => {
                this.presupuestoService.convertirAPedido(this.id!).subscribe({
                    next: (pedido) => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Pedido y factura creados',
                            detail: (pedido.numero ? `Pedido ${pedido.numero} creado con factura en borrador. ` : 'Pedido creado con factura en borrador. ') + 'Emití la factura cuando corresponda.'
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

    /** Navega a la vista del documento de venta (factura) asociado al presupuesto finalizado. */
    verFacturaAsociada(): void {
        const doc = this.presupuesto()?.documentoVenta;
        if (doc?.id) this.router.navigate(['/pages/documentos-venta/ver', doc.id]);
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
