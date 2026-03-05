import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CajaService, Caja, MovimientoCaja, DENOMINACIONES_PYG, type DenominacionCaja, type CajaDenominacion } from '../service/caja.service';

@Component({
    selector: 'app-caja',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        DialogModule,
        InputNumberModule,
        ToastModule,
        CardModule,
        ConfirmDialogModule,
        IconFieldModule,
        InputIconModule,
        TagModule,
        SelectModule
    ],
    templateUrl: './caja.component.html',
    styleUrls: ['./caja.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class CajaComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    cajaAbierta = signal<Caja | null>(null);
    sesiones = signal<Caja[]>([]);
    saldoEsperado = signal(0);
    movimientosList = signal<MovimientoCaja[]>([]);
    cajaSeleccionada: Caja | null = null;

    dialogAbrir = false;
    dialogCerrar = false;
    dialogMovimiento = false;
    dialogVerMovimientos = false;

    montoApertura = 0;
    observacionesApertura = '';
    montoCierreReal = 0;
    observacionesCierre = '';

    movTipo = 'INGRESO';
    movMonto = 0;
    movConcepto = '';
    movReferencia = '';
    movObservaciones = '';

    /** Desglose por denominación PYG (apertura). Cada elemento: { valorPyg, cantidad }. */
    denomApertura: { valorPyg: number; cantidad: number }[] = [];
    /** Desglose por denominación PYG (cierre/arqueo). */
    denomCierre: { valorPyg: number; cantidad: number }[] = [];

    readonly denominacionesPyg = [...DENOMINACIONES_PYG];
    listadoDenominaciones = signal<CajaDenominacion[]>([]);
    dialogDesglose = false;
    tituloDesglose = '';

    tiposMovimiento = [
        { label: 'Ingreso', value: 'INGRESO' },
        { label: 'Egreso', value: 'EGRESO' }
    ];

    loading = signal(false);

    constructor(
        private cajaService: CajaService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.cajaService.getAbierta().subscribe({
            next: (c) => {
                this.cajaAbierta.set(c ?? null);
                if (c?.id) this.actualizarSaldoEsperado(c.id);
                this.loading.set(false);
            },
            error: () => {
                this.cajaAbierta.set(null);
                this.loading.set(false);
            }
        });
        this.cajaService.list().subscribe({
            next: (list) => this.sesiones.set(list ?? []),
            error: () => this.sesiones.set([])
        });
    }

    actualizarSaldoEsperado(cajaId: number): void {
        this.cajaService.getSaldoEsperado(cajaId).subscribe({
            next: (r) => this.saldoEsperado.set(r.saldoEsperado ?? 0),
            error: () => {}
        });
    }

    openAbrirDialog(): void {
        this.montoApertura = 0;
        this.observacionesApertura = '';
        this.denomApertura = this.denominacionesPyg.map(v => ({ valorPyg: v, cantidad: 0 }));
        this.dialogAbrir = true;
    }

    totalDesdeDenomApertura(): number {
        return this.denomApertura.reduce((s, d) => s + d.valorPyg * (d.cantidad || 0), 0);
    }

    totalDesdeDenomCierre(): number {
        return this.denomCierre.reduce((s, d) => s + d.valorPyg * (d.cantidad || 0), 0);
    }

    aplicarTotalApertura(): void {
        const t = this.totalDesdeDenomApertura();
        if (t > 0) this.montoApertura = t;
    }

    aplicarTotalCierre(): void {
        const t = this.totalDesdeDenomCierre();
        if (t > 0) this.montoCierreReal = t;
    }

    abrirCaja(): void {
        const denom = this.denomApertura.filter(d => d.cantidad > 0).map(d => ({ valorPyg: d.valorPyg, cantidad: d.cantidad }));
        this.cajaService.abrir(this.montoApertura, this.observacionesApertura || undefined, denom.length ? denom : undefined).subscribe({
            next: (caja) => {
                this.messageService.add({ severity: 'success', summary: 'Caja abierta', detail: 'Sesión iniciada correctamente.' });
                this.dialogAbrir = false;
                this.cajaAbierta.set(caja);
                this.saldoEsperado.set(caja.montoApertura ?? 0);
                this.load();
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo abrir la caja.' })
        });
    }

    openCerrarDialog(): void {
        const c = this.cajaAbierta();
        if (!c?.id) return;
        this.montoCierreReal = this.saldoEsperado();
        this.observacionesCierre = '';
        this.denomCierre = this.denominacionesPyg.map(v => ({ valorPyg: v, cantidad: 0 }));
        this.dialogCerrar = true;
    }

    cerrarCaja(): void {
        const c = this.cajaAbierta();
        if (!c?.id) return;
        const denom = this.denomCierre.filter(d => d.cantidad > 0).map(d => ({ valorPyg: d.valorPyg, cantidad: d.cantidad }));
        this.cajaService.cerrar(c.id, this.montoCierreReal, this.observacionesCierre || undefined, denom.length ? denom : undefined).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Caja cerrada', detail: 'Sesión cerrada correctamente.' });
                this.dialogCerrar = false;
                this.cajaAbierta.set(null);
                this.saldoEsperado.set(0);
                this.load();
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo cerrar la caja.' })
        });
    }

    openMovimientoDialog(): void {
        this.movTipo = 'INGRESO';
        this.movMonto = 0;
        this.movConcepto = '';
        this.movReferencia = '';
        this.movObservaciones = '';
        this.dialogMovimiento = true;
    }

    registrarMovimiento(): void {
        const c = this.cajaAbierta();
        if (!c?.id) return;
        if (this.movMonto <= 0) {
            this.messageService.add({ severity: 'warn', summary: 'Monto', detail: 'El monto debe ser mayor a cero.' });
            return;
        }
        this.cajaService.agregarMovimiento(c.id, this.movTipo, this.movMonto, this.movConcepto || undefined, this.movReferencia || undefined, this.movObservaciones || undefined).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Movimiento registrado', detail: '' });
                this.dialogMovimiento = false;
                if (c.id) this.actualizarSaldoEsperado(c.id);
                this.load();
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo registrar.' })
        });
    }

    verMovimientos(row: Caja): void {
        this.cajaSeleccionada = row;
        this.cajaService.getMovimientos(row.id!).subscribe({
            next: (list) => this.movimientosList.set(list ?? []),
            error: () => this.movimientosList.set([])
        });
        this.dialogVerMovimientos = true;
    }

    verDesglose(row: Caja): void {
        if (!row.id) return;
        this.tituloDesglose = 'Desglose por denominación (Gs.) - ' + (row.numero ?? 'Caja #' + row.id);
        this.cajaService.getDenominaciones(row.id).subscribe({
            next: (list) => this.listadoDenominaciones.set(list ?? []),
            error: () => this.listadoDenominaciones.set([])
        });
        this.dialogDesglose = true;
    }
}
