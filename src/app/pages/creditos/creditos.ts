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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CreditoService, Credito } from '../service/credito.service';
import { ClienteService, Cliente } from '../service/cliente.service';
import { MaestrosService } from '../service/maestros.service';

@Component({
    selector: 'app-creditos',
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
    clientesSugeridos: Cliente[] = [];
    selectedClienteCredito: Cliente | null = null;
    clienteNombreCache: Record<number, string> = {};
    monedas: { id: number; codigo?: string }[] = [];
    sistemasOpt = [
        { label: 'Francés', value: 'FR' },
        { label: 'Alemán', value: 'AL' }
    ];
    dialogNuevo = false;
    dialogDetalle = false;
    credito: Credito = {};
    creditoSeleccionado: Credito | null = null;
    loading = signal(false);

    constructor(
        private creditoService: CreditoService,
        private clienteService: ClienteService,
        private maestros: MaestrosService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.load();
        this.maestros.monedas().subscribe((m) => (this.monedas = m ?? []));
    }

    buscarClientes(event: AutoCompleteCompleteEvent): void {
        this.clienteService.buscar(event.query, 20).subscribe((r) => (this.clientesSugeridos = r ?? []));
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

    onClienteCreditoSelect(): void {
        if (this.selectedClienteCredito?.id) {
            this.credito.cliente = { id: this.selectedClienteCredito.id };
            this.clienteNombreCache[this.selectedClienteCredito.id] = this.selectedClienteCredito.razonSocial ?? '';
        }
    }

    getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (estado === 'VIGENTE') return 'info';
        if (estado === 'CANCELADO') return 'danger';
        if (estado === 'PAGADO') return 'success';
        return 'secondary';
    }

    openNew(): void {
        this.credito = {
            fechaInicio: new Date().toISOString().slice(0, 10),
            sistemaAmort: 'FR',
            nroCuotas: 12,
            tasaInteresAnual: 0
        };
        this.selectedClienteCredito = null;
        this.dialogNuevo = true;
    }

    crearCredito(): void {
        if (!this.credito.cliente?.id || !this.credito.moneda?.id || this.credito.montoTotal == null) {
            this.messageService.add({ severity: 'warn', summary: 'Datos requeridos', detail: 'Cliente, moneda y monto son obligatorios.' });
            return;
        }
        const payload: Credito = {
            ...this.credito,
            cliente: { id: this.credito.cliente.id },
            moneda: { id: this.credito.moneda.id }
        };
        this.creditoService.create(payload).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Crédito creado.' });
                this.dialogNuevo = false;
                this.load();
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al crear.' })
        });
    }

    verDetalle(row: Credito): void {
        this.creditoService.getById(row.id!).subscribe({
            next: (c) => {
                this.creditoSeleccionado = c;
                this.dialogDetalle = true;
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el crédito.' })
        });
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
