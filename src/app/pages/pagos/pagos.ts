import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { PagoService, Pago, PagoAplicacion } from '../service/pago.service';
import { ClienteService, Cliente } from '../service/cliente.service';
import { CarteraService, DocumentoSaldoDTO, PendientesClienteDTO, CreditoPendienteDTO, CuotaSaldoDTO } from '../service/cartera.service';
import { CreditoService } from '../service/credito.service';
import { MaestrosService } from '../service/maestros.service';

@Component({
    selector: 'app-pagos',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        DialogModule,
        AutoCompleteModule,
        SelectModule,
        InputNumberModule,
        ToastModule,
        ToolbarModule,
        CardModule,
        TagModule,
        IconFieldModule,
        InputIconModule
    ],
    templateUrl: './pagos.component.html',
    styleUrls: ['./pagos.component.scss'],
    providers: [MessageService]
})
export class PagosComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    pagos = signal<Pago[]>([]);
    clientesSugeridos: Cliente[] = [];
    selectedCliente: Cliente | null = null;
    clienteNombreCache: Record<number, string> = {};
    monedas: { id: number; codigo?: string }[] = [];
    mediosPago: { id: number; nombre?: string }[] = [];
    documentosConSaldo: DocumentoSaldoDTO[] = [];
    /** Todas las cuotas pendientes (para selector y pagos adelantados). */
    cuotasPendientes: { id: number; label: string; creditoId: number; saldoPendiente: number }[] = [];
    tiposAplicacion = [
        { label: 'Documento', value: 'DOCUMENTO' },
        { label: 'Cuota', value: 'CUOTA' }
    ];
    dialog = false;
    dialogCancelacion = false;
    pago: Pago = { fechaPago: new Date().toISOString().slice(0, 10), montoTotal: 0 };
    aplicaciones: { tipoAplicacion: 'DOCUMENTO' | 'CUOTA'; documentoVentaId?: number; creditoCuotaId?: number; montoAplicado: number }[] = [];
    loading = signal(false);
    loadingPendientes = signal(false);
    pendientes: PendientesClienteDTO | null = null;
    creditoCancelar: CreditoPendienteDTO | null = null;
    cancelacionFecha = new Date().toISOString().slice(0, 10);
    cancelacionMedioPagoId: number | null = null;
    cancelacionReferencia = '';
    cancelacionObservaciones = '';

    constructor(
        private pagoService: PagoService,
        private clienteService: ClienteService,
        private carteraService: CarteraService,
        private creditoService: CreditoService,
        private maestros: MaestrosService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.load();
        this.maestros.monedas().subscribe((m) => (this.monedas = m ?? []));
        this.maestros.mediosPago().subscribe((mp) => (this.mediosPago = mp ?? []));
    }

    buscarClientes(event: AutoCompleteCompleteEvent): void {
        const q = (event.query ?? '').trim();
        if (q.length < 2) {
            this.clientesSugeridos = [];
            return;
        }
        if (/^\d{8,}$/.test(q)) {
            this.clienteService.getByRuc(q).subscribe({
                next: (c) => (this.clientesSugeridos = c ? [c] : []),
                error: () => this.clienteService.buscar(q, 20).subscribe((r) => (this.clientesSugeridos = r ?? []))
            });
        } else {
            this.clienteService.buscar(q, 20).subscribe((r) => (this.clientesSugeridos = r ?? []));
        }
    }

    load(): void {
        this.loading.set(true);
        this.pagoService.list().subscribe({
            next: (list) => {
                const items = list ?? [];
                this.pagos.set(items);
                items.forEach((p) => {
                    const cliente = p.cliente as unknown as { id?: number; razonSocial?: string };
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

    onClienteSelect(): void {
        this.pendientes = null;
        const cid = this.selectedCliente?.id;
        if (cid == null) {
            this.pago.cliente = undefined;
            return;
        }
        this.pago.cliente = { id: cid };
        this.clienteNombreCache[cid] = this.selectedCliente!.razonSocial ?? '';
        this.loadPendientes(cid);
    }

    loadPendientes(clienteId: number): void {
        this.loadingPendientes.set(true);
        this.carteraService.pendientesCliente(clienteId).subscribe({
            next: (dto) => {
                this.pendientes = dto;
                this.documentosConSaldo = dto.documentos ?? [];
                const cuotas: { id: number; label: string; creditoId: number; saldoPendiente: number }[] = [];
                (dto.creditos ?? []).forEach((cr) => {
                    const desglose = cr.cancelacionAnticipada?.desglose ?? [];
                    desglose.forEach((cu: CuotaSaldoDTO) => {
                        const adelantada = cu.adelantada === true;
                        cuotas.push({
                            id: cu.cuotaId,
                            label: `Crédito ${cr.creditoId} - Cuota ${cu.nroCuota}${adelantada ? ' (adelantada)' : ''}`,
                            creditoId: cr.creditoId,
                            saldoPendiente: cu.saldoPendiente ?? 0
                        });
                    });
                });
                this.cuotasPendientes = cuotas;
                this.loadingPendientes.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los pendientes.' });
                this.loadingPendientes.set(false);
            }
        });
    }

    getClienteNombre(id: number | undefined): string {
        if (id == null) return '-';
        return this.clienteNombreCache[id] ?? String(id);
    }

    tienePendientes(): boolean {
        const p = this.pendientes;
        if (!p) return false;
        return ((p.documentos?.length ?? 0) + (p.creditos?.length ?? 0)) > 0;
    }

    openNew(): void {
        this.pago = { fechaPago: new Date().toISOString().slice(0, 10), montoTotal: 0 };
        this.aplicaciones = [];
        if (this.selectedCliente) {
            this.pago.cliente = { id: this.selectedCliente.id! };
            this.documentosConSaldo = this.pendientes?.documentos ?? [];
            this.cuotasPendientes = [];
            (this.pendientes?.creditos ?? []).forEach((cr) => {
                const desglose = cr.cancelacionAnticipada?.desglose ?? [];
                desglose.forEach((cu: CuotaSaldoDTO) => {
                    this.cuotasPendientes.push({
                        id: cu.cuotaId,
                        label: `Crédito ${cr.creditoId} - Cuota ${cu.nroCuota}${cu.adelantada ? ' (adelantada)' : ''}`,
                        creditoId: cr.creditoId,
                        saldoPendiente: cu.saldoPendiente ?? 0
                    });
                });
            });
        } else {
            this.documentosConSaldo = [];
            this.cuotasPendientes = [];
        }
        this.dialog = true;
    }

    onClienteSelectEnDialog(cliente: Cliente): void {
        this.pago.cliente = { id: cliente.id! };
        this.clienteNombreCache[cliente.id!] = cliente.razonSocial ?? '';
        this.carteraService.pendientesCliente(cliente.id!).subscribe((dto) => {
            this.documentosConSaldo = dto.documentos ?? [];
            this.cuotasPendientes = [];
            (dto.creditos ?? []).forEach((cr) => {
                const desglose = cr.cancelacionAnticipada?.desglose ?? [];
                desglose.forEach((cu: CuotaSaldoDTO) => {
                    this.cuotasPendientes.push({
                        id: cu.cuotaId,
                        label: `Crédito ${cr.creditoId} - Cuota ${cu.nroCuota}${cu.adelantada ? ' (adelantada)' : ''}`,
                        creditoId: cr.creditoId,
                        saldoPendiente: cu.saldoPendiente ?? 0
                    });
                });
            });
        });
    }

    clearClienteEnDialog(): void {
        this.pago.cliente = undefined;
        this.documentosConSaldo = [];
        this.cuotasPendientes = [];
    }

    openPagarDocumento(doc: DocumentoSaldoDTO): void {
        this.pago = {
            fechaPago: new Date().toISOString().slice(0, 10),
            montoTotal: doc.saldoPendiente ?? 0,
            cliente: this.selectedCliente ? { id: this.selectedCliente.id! } : undefined
        };
        this.aplicaciones = [{ tipoAplicacion: 'DOCUMENTO', documentoVentaId: doc.documentoVentaId, montoAplicado: doc.saldoPendiente ?? 0 }];
        this.dialog = true;
    }

    /** Abre el diálogo para pagar la primera cuota pendiente del crédito. */
    openPagarCuotas(credito: CreditoPendienteDTO): void {
        const desglose = credito.cancelacionAnticipada?.desglose ?? [];
        const cuotaAPagar = desglose[0];
        if (cuotaAPagar) this.openPagarUnaCuota(credito, cuotaAPagar);
    }

    /** Abre el diálogo para pagar una cuota concreta (permite pagos adelantados). */
    openPagarUnaCuota(credito: CreditoPendienteDTO, cuota: CuotaSaldoDTO): void {
        const monto = cuota.saldoPendiente ?? 0;
        this.pago = {
            fechaPago: new Date().toISOString().slice(0, 10),
            montoTotal: monto,
            cliente: this.selectedCliente ? { id: this.selectedCliente.id! } : undefined
        };
        this.aplicaciones = [{
            tipoAplicacion: 'CUOTA' as const,
            creditoCuotaId: cuota.cuotaId,
            montoAplicado: monto
        }];
        this.dialog = true;
    }

    openCancelarPrestamo(credito: CreditoPendienteDTO): void {
        this.creditoCancelar = credito;
        this.cancelacionFecha = new Date().toISOString().slice(0, 10);
        this.cancelacionMedioPagoId = null;
        this.cancelacionReferencia = '';
        this.cancelacionObservaciones = '';
        this.dialogCancelacion = true;
    }

    addAplicacion(): void {
        this.aplicaciones.push({ tipoAplicacion: 'DOCUMENTO', montoAplicado: 0 });
    }

    removeAplicacion(app: (typeof this.aplicaciones)[0]): void {
        this.aplicaciones = this.aplicaciones.filter((a) => a !== app);
    }

    hideDialog(): void {
        this.dialog = false;
    }

    hideDialogCancelacion(): void {
        this.dialogCancelacion = false;
        this.creditoCancelar = null;
    }

    onDialogHide(): void {
        this.pago = { fechaPago: new Date().toISOString().slice(0, 10), montoTotal: 0 };
        this.aplicaciones = [];
        this.selectedCliente = null;
    }

    registrar(): void {
        if (!this.pago.cliente?.id || !this.pago.fechaPago || this.pago.montoTotal == null) {
            this.messageService.add({ severity: 'warn', summary: 'Datos requeridos', detail: 'Cliente, fecha y monto son obligatorios.' });
            return;
        }
        const apps: PagoAplicacion[] = this.aplicaciones
            .filter((a) => a.montoAplicado > 0 && (a.tipoAplicacion === 'DOCUMENTO' ? a.documentoVentaId : a.creditoCuotaId))
            .map((a) => ({
                tipoAplicacion: a.tipoAplicacion,
                documentoVenta: a.documentoVentaId ? { id: a.documentoVentaId } : undefined,
                creditoCuota: a.creditoCuotaId ? { id: a.creditoCuotaId } : undefined,
                montoAplicado: a.montoAplicado
            }));
        if (apps.length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Aplicaciones', detail: 'Agregue al menos una aplicación con monto.' });
            return;
        }
        const payload: Pago = {
            ...this.pago,
            cliente: { id: this.pago.cliente.id },
            moneda: this.pago.moneda?.id ? { id: this.pago.moneda.id } : undefined,
            medioPago: this.pago.medioPago?.id ? { id: this.pago.medioPago.id } : undefined,
            aplicaciones: apps
        };
        this.pagoService.registrar(payload).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Pago registrado.' });
                this.hideDialog();
                this.load();
                if (this.selectedCliente?.id) this.loadPendientes(this.selectedCliente.id);
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al registrar.' })
        });
    }

    confirmarCancelacion(): void {
        if (!this.creditoCancelar?.creditoId) return;
        const req = {
            fechaPago: this.cancelacionFecha,
            medioPagoId: this.cancelacionMedioPagoId ?? undefined,
            referencia: this.cancelacionReferencia || undefined,
            observaciones: this.cancelacionObservaciones || undefined
        };
        this.creditoService.cancelarAnticipado(this.creditoCancelar.creditoId, req).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Préstamo cancelado. Se registró el pago y se dieron de baja las cuotas pendientes.' });
                this.hideDialogCancelacion();
                this.load();
                if (this.selectedCliente?.id) this.loadPendientes(this.selectedCliente.id);
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al cancelar.' })
        });
    }

    estadoCreditoTag(estado: string): string {
        if (estado === 'VIGENTE') return 'success';
        if (estado === 'VENCIDO') return 'danger';
        return 'warning';
    }
}
