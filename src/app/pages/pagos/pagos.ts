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
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { PagoService, Pago, PagoAplicacion } from '../service/pago.service';
import { ClienteService, Cliente } from '../service/cliente.service';
import { CarteraService, DocumentoSaldoDTO } from '../service/cartera.service';
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
    cuotasPendientes: { id: number; label: string }[] = [];
    tiposAplicacion = [
        { label: 'Documento', value: 'DOCUMENTO' },
        { label: 'Cuota', value: 'CUOTA' }
    ];
    dialog = false;
    pago: Pago = { fechaPago: new Date().toISOString().slice(0, 10), montoTotal: 0 };
    aplicaciones: { tipoAplicacion: 'DOCUMENTO' | 'CUOTA'; documentoVentaId?: number; creditoCuotaId?: number; montoAplicado: number }[] = [];
    loading = signal(false);

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
        this.clienteService.buscar(event.query, 20).subscribe((r) => (this.clientesSugeridos = r ?? []));
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
        this.documentosConSaldo = [];
        this.cuotasPendientes = [];
        const cid = this.selectedCliente?.id;
        if (cid == null) {
            this.pago.cliente = undefined;
            return;
        }
        this.pago.cliente = { id: cid };
        this.clienteNombreCache[cid] = this.selectedCliente!.razonSocial ?? '';
        this.carteraService.documentosConSaldo().subscribe((list) => {
            this.documentosConSaldo = (list ?? []).filter((d) => d.clienteId === cid);
        });
        this.creditoService.listPorCliente(cid).subscribe((creditos) => {
            const cuotas: { id: number; label: string }[] = [];
            (creditos ?? []).forEach((cr) => {
                if (cr.estado !== 'VIGENTE') return;
                this.creditoService.getById(cr.id!).subscribe((c) => {
                    (c.cuotas ?? []).filter((cu) => cu.estado !== 'PAGADA').forEach((cu) => {
                        cuotas.push({ id: cu.id!, label: `Crédito ${cr.id} - Cuota ${cu.nroCuota}` });
                    });
                    this.cuotasPendientes = [...cuotas];
                });
            });
        });
    }

    getClienteNombre(id: number | undefined): string {
        if (id == null) return '-';
        return this.clienteNombreCache[id] ?? String(id);
    }

    openNew(): void {
        this.pago = { fechaPago: new Date().toISOString().slice(0, 10), montoTotal: 0 };
        this.aplicaciones = [];
        this.selectedCliente = null;
        this.documentosConSaldo = [];
        this.cuotasPendientes = [];
        this.dialog = true;
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
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al registrar.' })
        });
    }
}
