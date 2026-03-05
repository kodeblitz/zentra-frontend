import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService, ConfirmationService } from 'primeng/api';
import { GastoService, Gasto } from '../service/gasto.service';
import { TipoGastoService, TipoGasto } from '../service/tipo-gasto.service';
import { MaestrosService, Moneda } from '../service/maestros.service';

@Component({
    selector: 'app-gastos',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        DialogModule,
        SelectModule,
        InputNumberModule,
        ToastModule,
        ToolbarModule,
        ConfirmDialogModule,
        IconFieldModule,
        InputIconModule
    ],
    templateUrl: './gastos.component.html',
    styleUrls: ['./gastos.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class GastosComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    gastos = signal<Gasto[]>([]);
    tiposGasto: TipoGasto[] = [];
    monedas: Moneda[] = [];
    dialog = false;
    editing = false;
    submitted = false;
    gasto: Gasto = {};
    filterDesde = '';
    filterHasta = '';
    loading = signal(false);

    constructor(
        private gastoService: GastoService,
        private tipoGastoService: TipoGastoService,
        private maestros: MaestrosService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.load();
        this.tipoGastoService.listActivos().subscribe((t) => (this.tiposGasto = t ?? []));
        this.maestros.monedas().subscribe((m) => (this.monedas = m ?? []));
    }

    load(): void {
        this.loading.set(true);
        const desde = this.filterDesde || undefined;
        const hasta = this.filterHasta || undefined;
        if (desde || hasta) {
            this.gastoService.listPorFechas(desde ?? '', hasta ?? '').subscribe({
                next: (list) => {
                    this.gastos.set(list ?? []);
                    this.loading.set(false);
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar.' });
                    this.loading.set(false);
                }
            });
        } else {
            this.gastoService.list().subscribe({
                next: (list) => {
                    this.gastos.set(list ?? []);
                    this.loading.set(false);
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar.' });
                    this.loading.set(false);
                }
            });
        }
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openNew(): void {
        this.gasto = {
            fecha: new Date().toISOString().slice(0, 10),
            monto: 0
        };
        this.editing = false;
        this.submitted = false;
        this.dialog = true;
    }

    edit(row: Gasto): void {
        this.gasto = { ...row, tipoGasto: row.tipoGasto, moneda: row.moneda, proveedor: row.proveedor };
        this.editing = true;
        this.submitted = false;
        this.dialog = true;
    }

    hideDialog(): void {
        this.dialog = false;
        this.submitted = false;
    }

    getTipoNombre(g: Gasto): string {
        const t = g.tipoGasto as TipoGasto | undefined;
        return t?.nombre ?? `#${g.tipoGasto?.id ?? '-'}`;
    }

    save(): void {
        this.submitted = true;
        if (!this.gasto.tipoGasto?.id) {
            this.messageService.add({ severity: 'warn', summary: 'Tipo requerido', detail: 'Seleccioná un tipo de gasto.' });
            return;
        }
        if (this.gasto.monto == null || this.gasto.monto < 0) {
            this.messageService.add({ severity: 'warn', summary: 'Monto', detail: 'Ingresá un monto válido.' });
            return;
        }
        const payload: Gasto = {
            tipoGasto: { id: this.gasto.tipoGasto.id },
            fecha: this.gasto.fecha,
            monto: this.gasto.monto,
            moneda: this.gasto.moneda?.id ? { id: this.gasto.moneda.id } : undefined,
            descripcion: this.gasto.descripcion,
            numeroReferencia: this.gasto.numeroReferencia,
            proveedor: this.gasto.proveedor?.id ? { id: this.gasto.proveedor.id } : undefined
        };
        const req = this.editing && this.gasto.id
            ? this.gastoService.update({ ...payload, id: this.gasto.id })
            : this.gastoService.create(payload);
        req.subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: this.editing ? 'Gasto actualizado.' : 'Gasto registrado.' });
                this.hideDialog();
                this.load();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar.' });
            }
        });
    }

    confirmDelete(row: Gasto): void {
        this.confirmationService.confirm({
            message: '¿Eliminar este registro de gasto?',
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(row.id!)
        });
    }

    delete(id: number): void {
        this.gastoService.delete(id).subscribe({
            next: () => {
                this.gastos.set(this.gastos().filter((g) => g.id !== id));
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Gasto eliminado.' });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar.' });
            }
        });
    }
}
