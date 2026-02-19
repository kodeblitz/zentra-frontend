import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { CreditoService, Credito, CreditoCuota } from '../../service/credito.service';
import { ClienteService } from '../../service/cliente.service';
import { PagoService } from '../../service/pago.service';
import { CarteraService } from '../../service/cartera.service';
import { MaestrosService } from '../../service/maestros.service';

@Component({
    selector: 'app-credito-ver',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ButtonModule,
        CardModule,
        TagModule,
        TableModule,
        ToastModule,
        DialogModule,
        InputNumberModule,
        InputTextModule,
        SelectModule
    ],
    templateUrl: './credito-ver.component.html',
    styleUrl: './credito-ver.component.scss',
    providers: [MessageService]
})
export class CreditoVerComponent implements OnInit {
    credito = signal<Credito | null>(null);
    clienteNombre = signal<string>('');
    loading = signal(true);
    /** Monto a pagar por cuota si se paga hoy (adelantadas: sin interés completo). cuotaId -> monto */
    montosPagarHoy = signal<Record<string, number>>({});
    dialogPagarCuota = false;
    dialogCancelar = false;
    pagarCuotaFecha = new Date().toISOString().slice(0, 10);
    pagarCuotaMonto = 0;
    pagarCuotaMedioPagoId: number | null = null;
    pagarCuotaReferencia = '';
    cancelarFecha = new Date().toISOString().slice(0, 10);
    cancelarMedioPagoId: number | null = null;
    cancelarReferencia = '';
    cancelarObservaciones = '';
    cancelacionMontoTotal = 0;
    mediosPago: { id: number; nombre?: string }[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private creditoService: CreditoService,
        private clienteService: ClienteService,
        private pagoService: PagoService,
        private carteraService: CarteraService,
        private maestros: MaestrosService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.maestros.mediosPago().subscribe((mp) => (this.mediosPago = mp ?? []));
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
            const id = +idParam;
            this.load(id);
        } else {
            this.router.navigate(['/pages/creditos']);
        }
    }

    load(id: number): void {
        this.loading.set(true);
        this.creditoService.getById(id).subscribe({
            next: (c) => {
                this.credito.set(c);
                const clienteId = c.cliente?.id;
                if (clienteId) {
                    this.clienteService.getById(clienteId).subscribe({
                        next: (cl) => this.clienteNombre.set(cl.razonSocial ?? ''),
                        error: () => this.clienteNombre.set(String(clienteId))
                    });
                } else {
                    this.clienteNombre.set('-');
                }
                if (c?.id && (c.estado === 'VIGENTE' || c.estado === 'VENCIDO')) {
                    this.creditoService.montosPagarHoy(c.id).subscribe({
                        next: (map) => this.montosPagarHoy.set(map ?? {}),
                        error: () => this.montosPagarHoy.set({})
                    });
                } else {
                    this.montosPagarHoy.set({});
                }
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.router.navigate(['/pages/creditos']);
            }
        });
    }

    volver(): void {
        this.router.navigate(['/pages/creditos']);
    }

    getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (estado === 'VIGENTE') return 'info';
        if (estado === 'CANCELADO') return 'danger';
        if (estado === 'PAGADO') return 'success';
        return 'secondary';
    }

    getCuotaEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (estado === 'PAGADA') return 'success';
        if (estado === 'VENCIDA') return 'danger';
        if (estado === 'PARCIAL') return 'warn';
        return 'secondary';
    }

    getSistemaLabel(sistema: string | undefined): string {
        if (sistema === 'FRANCES' || sistema === 'FR') return 'Francés';
        if (sistema === 'ALEMAN' || sistema === 'AL') return 'Alemán';
        return sistema ?? '-';
    }

    getCuotas(): CreditoCuota[] {
        return this.credito()?.cuotas ?? [];
    }

    getResumenCuotas(): { total: number; pagadas: number; pendientes: number; montoTotalCuotas: number } {
        const cuotas = this.getCuotas();
        const pagadas = cuotas.filter((c) => c.estado === 'PAGADA').length;
        const montoTotalCuotas = cuotas.reduce((sum, c) => sum + (c.montoCuota ?? 0), 0);
        return {
            total: cuotas.length,
            pagadas,
            pendientes: cuotas.length - pagadas,
            montoTotalCuotas
        };
    }

    /** Monto a pagar si se paga hoy (adelantada: capital + interés proporcional). */
    getMontoPagarHoy(cuota: CreditoCuota): number | null {
        if (cuota.estado === 'PAGADA' || cuota.id == null) return null;
        const m = this.montosPagarHoy()[String(cuota.id)];
        return m != null ? m : null;
    }

    /** Primera cuota no pagada (cuota a pagar). */
    getProximaCuota(): CreditoCuota | null {
        const cuotas = this.getCuotas().filter((c) => c.estado !== 'PAGADA').sort((a, b) => (a.nroCuota ?? 0) - (b.nroCuota ?? 0));
        return cuotas[0] ?? null;
    }

    puedePagarOCancelar(): boolean {
        const c = this.credito();
        return (c?.estado === 'VIGENTE' || c?.estado === 'VENCIDO') && (this.getCuotas().some((cu) => cu.estado !== 'PAGADA') ?? false);
    }

    openPagarCuota(): void {
        const proxima = this.getProximaCuota();
        const c = this.credito();
        if (!proxima?.id || !c?.cliente?.id) return;
        this.pagarCuotaFecha = new Date().toISOString().slice(0, 10);
        this.pagarCuotaMedioPagoId = null;
        this.pagarCuotaReferencia = '';
        this.carteraService.saldoCuota(proxima.id, this.pagarCuotaFecha).subscribe({
            next: (r) => {
                this.pagarCuotaMonto = r?.saldoPendiente ?? proxima.montoCuota ?? 0;
                this.dialogPagarCuota = true;
            },
            error: () => {
                this.pagarCuotaMonto = proxima.montoCuota ?? 0;
                this.dialogPagarCuota = true;
            }
        });
    }

    /** Recalcula el monto a pagar según la fecha (interés proporcional si es adelantada). */
    actualizarMontoPagarCuota(cuotaId: number | undefined): void {
        if (cuotaId == null) return;
        const proxima = this.getProximaCuota();
        if (!proxima?.id || proxima.id !== cuotaId) return;
        this.carteraService.saldoCuota(cuotaId, this.pagarCuotaFecha).subscribe({
            next: (r) => {
                this.pagarCuotaMonto = r?.saldoPendiente ?? proxima.montoCuota ?? 0;
            },
            error: () => {
                this.pagarCuotaMonto = proxima.montoCuota ?? 0;
            }
        });
    }

    confirmarPagarCuota(): void {
        const proxima = this.getProximaCuota();
        const c = this.credito();
        if (!proxima?.id || !c?.cliente?.id || this.pagarCuotaMonto <= 0) return;
        const payload = {
            cliente: { id: c.cliente.id },
            fechaPago: this.pagarCuotaFecha,
            montoTotal: this.pagarCuotaMonto,
            medioPago: this.pagarCuotaMedioPagoId ? { id: this.pagarCuotaMedioPagoId } : undefined,
            referencia: this.pagarCuotaReferencia || undefined,
            aplicaciones: [{ tipoAplicacion: 'CUOTA' as const, creditoCuota: { id: proxima.id }, montoAplicado: this.pagarCuotaMonto }]
        };
        this.pagoService.registrar(payload).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Pago registrado.' });
                this.dialogPagarCuota = false;
                this.load(c.id!);
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Error al registrar.' })
        });
    }

    openCancelarCredito(): void {
        const c = this.credito();
        if (!c?.id) return;
        this.creditoService.saldoCancelacionAnticipada(c.id).subscribe({
            next: (dto) => {
                this.cancelacionMontoTotal = dto?.montoTotal ?? 0;
                this.cancelarFecha = new Date().toISOString().slice(0, 10);
                this.cancelarMedioPagoId = null;
                this.cancelarReferencia = '';
                this.cancelarObservaciones = '';
                this.dialogCancelar = true;
            }
        });
    }

    recalcularCuotas(): void {
        const c = this.credito();
        if (!c?.id) return;
        this.creditoService.recalcularEstadosCuotas(c.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estado de cuotas recalculado.' });
                this.load(c.id!);
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Error al recalcular.' })
        });
    }

    confirmarCancelarCredito(): void {
        const c = this.credito();
        if (!c?.id) return;
        this.creditoService.cancelarAnticipado(c.id, {
            fechaPago: this.cancelarFecha,
            medioPagoId: this.cancelarMedioPagoId ?? undefined,
            referencia: this.cancelarReferencia || undefined,
            observaciones: this.cancelarObservaciones || undefined
        }).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Crédito cancelado.' });
                this.dialogCancelar = false;
                this.load(c.id!);
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Error al cancelar.' })
        });
    }
}
