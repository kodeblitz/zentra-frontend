import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CreditoService, Credito } from '../../service/credito.service';
import { ClienteService, Cliente } from '../../service/cliente.service';
import { MaestrosService } from '../../service/maestros.service';
import { generarCuotas, CuotaCalculada } from '../amortizacion.util';

@Component({
    selector: 'app-credito-nuevo',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ButtonModule,
        CardModule,
        AutoCompleteModule,
        SelectModule,
        InputNumberModule,
        InputTextModule,
        TableModule,
        ToastModule
    ],
    templateUrl: './credito-nuevo.component.html',
    styleUrl: './credito-nuevo.component.scss',
    providers: [MessageService]
})
export class CreditoNuevoComponent implements OnInit {
    selectedCliente: Cliente | null = null;
    clientesSugeridos: Cliente[] = [];
    monedas: { id: number; codigo?: string }[] = [];

    credito: Credito = {
        fechaInicio: new Date().toISOString().slice(0, 10),
        sistemaAmort: 'FR',
        nroCuotas: 12,
        tasaInteresAnual: 0,
        tasaMoraAnual: undefined,
        diasGracia: 0
    };

    sistemasOpt = [
        { label: 'Francés (cuota fija)', value: 'FR' },
        { label: 'Alemán (amort. constante)', value: 'AL' }
    ];

    loading = signal(false);
    enviando = signal(false);
    /** Se actualiza al cambiar parámetros del formulario para que el computed del preview se recalcule. */
    private previewVersion = signal(0);

    constructor(
        private router: Router,
        private creditoService: CreditoService,
        private clienteService: ClienteService,
        private maestros: MaestrosService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.maestros.monedas().subscribe((m) => (this.monedas = m ?? []));
    }

    buscarClientes(event: AutoCompleteCompleteEvent): void {
        this.clienteService.buscar(event.query, 20).subscribe((r) => (this.clientesSugeridos = r ?? []));
    }

    onClienteSelect(): void {
        if (this.selectedCliente?.id) {
            this.credito.cliente = { id: this.selectedCliente.id };
        }
    }

    /** Llamar cuando cambie cualquier parámetro que afecte el cálculo de cuotas. */
    onParamsChange(): void {
        this.previewVersion.update((v) => v + 1);
    }

    /** Fecha del primer vencimiento para el cálculo (si no está definida: inicio + 1 mes). */
    get fechaPrimerVencimientoCalc(): string {
        const first = this.credito.fechaPrimerVencimiento;
        if (first) return first;
        const inicio = this.credito.fechaInicio;
        if (!inicio) return new Date().toISOString().slice(0, 10);
        const d = new Date(inicio + 'T12:00:00');
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().slice(0, 10);
    }

    /** Cuotas calculadas en tiempo real según parámetros. */
    readonly cuotasPreview = computed(() => {
        this.previewVersion(); // dependencia para re-ejecutar al cambiar params
        const monto = this.credito.montoTotal ?? 0;
        const n = this.credito.nroCuotas ?? 0;
        const tasa = this.credito.tasaInteresAnual ?? 0;
        const sistema = (this.credito.sistemaAmort === 'AL' ? 'AL' : 'FR') as 'FR' | 'AL';
        if (monto <= 0 || n <= 0) return [];
        return generarCuotas(monto, tasa, n, this.fechaPrimerVencimientoCalc, sistema);
    });

    /** Resumen del preview: total a pagar, intereses, primera/última cuota. */
    readonly resumenPreview = computed(() => {
        const list = this.cuotasPreview();
        if (list.length === 0)
            return { totalPagar: 0, totalIntereses: 0, primeraCuota: 0, ultimaCuota: 0, montoPrincipal: this.credito.montoTotal ?? 0 };
        const totalPagar = list.reduce((s, c) => s + c.montoCuota, 0);
        const totalIntereses = list.reduce((s, c) => s + c.montoInteres, 0);
        return {
            totalPagar,
            totalIntereses,
            primeraCuota: list[0].montoCuota,
            ultimaCuota: list[list.length - 1].montoCuota,
            montoPrincipal: this.credito.montoTotal ?? 0
        };
    });

    getSistemaLabel(sistema: string | undefined): string {
        return sistema === 'AL' ? 'Alemán' : 'Francés';
    }

    volver(): void {
        this.router.navigate(['/pages/creditos']);
    }

    crearCredito(): void {
        if (!this.credito.cliente?.id || !this.credito.moneda?.id || this.credito.montoTotal == null || (this.credito.montoTotal ?? 0) <= 0) {
            this.messageService.add({ severity: 'warn', summary: 'Datos requeridos', detail: 'Cliente, moneda y monto son obligatorios.' });
            return;
        }
        if ((this.credito.nroCuotas ?? 0) <= 0) {
            this.messageService.add({ severity: 'warn', summary: 'Datos requeridos', detail: 'El número de cuotas debe ser al menos 1.' });
            return;
        }
        const payload: Credito = {
            ...this.credito,
            cliente: { id: this.credito.cliente.id },
            moneda: { id: this.credito.moneda.id },
            sistemaAmort: this.credito.sistemaAmort === 'AL' ? 'ALEMAN' : 'FRANCES'
        };
        this.enviando.set(true);
        this.creditoService.create(payload).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Crédito creado', detail: 'El crédito y sus cuotas fueron registrados.' });
                this.enviando.set(false);
                this.router.navigate(['/pages/creditos']);
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo crear el crédito.' });
                this.enviando.set(false);
            }
        });
    }
}
