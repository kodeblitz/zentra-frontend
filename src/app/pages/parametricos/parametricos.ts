import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { map } from 'rxjs';
import { MaestrosService, Categoria, TipoDocumento, Moneda, CondicionPago, UnidadMedida, MedioPago, Empresa, Timbrado, Sucursal } from '../service/maestros.service';

@Component({
    selector: 'app-parametricos',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TabsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        DialogModule,
        CheckboxModule,
        ToastModule,
        ConfirmDialogModule,
        TagModule
    ],
    templateUrl: './parametricos.component.html',
    styleUrls: ['./parametricos.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class ParametricosComponent implements OnInit {
    activeTab = 0;
    categorias: Categoria[] = [];
    tiposDocumento: TipoDocumento[] = [];
    monedas: Moneda[] = [];
    condicionesPago: CondicionPago[] = [];
    unidadesMedida: UnidadMedida[] = [];
    mediosPago: MedioPago[] = [];
    empresas: Empresa[] = [];
    timbrados: Timbrado[] = [];
    sucursales: Sucursal[] = [];

    /** Facturación Paraguay: empresa seleccionada para editar defaults. */
    facturacionEmpresa: Empresa | null = null;
    dialogTimbrado = false;
    timbradoEdit: Timbrado = {};
    dialogSucursal = false;
    sucursalEdit: Sucursal = {};
    guardandoFacturacion = false;
    guardandoTimbrado = false;
    guardandoSucursal = false;

    constructor(
        private maestros: MaestrosService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.maestros.categorias().subscribe((c) => (this.categorias = c ?? []));
        this.maestros.tiposDocumento().subscribe((t) => (this.tiposDocumento = t ?? []));
        this.maestros.monedas().subscribe((m) => (this.monedas = m ?? []));
        this.maestros.condicionesPago().subscribe((c) => (this.condicionesPago = c ?? []));
        this.maestros.unidadesMedida().subscribe((u) => (this.unidadesMedida = u ?? []));
        this.maestros.mediosPagoTodos().subscribe((m) => (this.mediosPago = m ?? []));
        this.maestros.empresas().subscribe((e) => {
            this.empresas = e ?? [];
            if (this.empresas.length > 0 && !this.facturacionEmpresa) {
                this.facturacionEmpresa = { ...this.empresas[0] };
            }
            this.loadTimbrados();
            this.loadSucursales();
        });
    }

    loadTimbrados(): void {
        const empId = this.facturacionEmpresa?.id ?? this.empresas[0]?.id;
        this.maestros.timbrados(empId).subscribe((t) => (this.timbrados = t ?? []));
    }

    loadSucursales(): void {
        const empId = this.facturacionEmpresa?.id ?? this.empresas[0]?.id;
        this.maestros.sucursales(empId).subscribe((s) => (this.sucursales = s ?? []));
    }

    onEmpresaIdChange(id: number): void {
        this.facturacionEmpresa = this.empresas.find((x) => x.id === id) ?? null;
        this.onFacturacionEmpresaChange();
    }

    onFacturacionEmpresaChange(): void {
        if (this.facturacionEmpresa?.id) {
            const e = this.empresas.find((x) => x.id === this.facturacionEmpresa!.id);
            if (e) this.facturacionEmpresa = { ...e };
            this.loadTimbrados();
            this.loadSucursales();
        }
    }

    guardarFacturacionDefaults(): void {
        const e = this.facturacionEmpresa;
        if (!e?.id) return;
        this.guardandoFacturacion = true;
        this.maestros.updateEmpresa(e.id, {
            establecimientoDefault: e.establecimientoDefault ?? '001',
            puntoEmisionDefault: e.puntoEmisionDefault ?? '001',
            sucursalDefault: e.sucursalDefault?.id != null ? { id: e.sucursalDefault.id } : null
        }).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Datos de facturación actualizados.' });
                this.maestros.empresas().subscribe((list) => (this.empresas = list ?? []));
                this.guardandoFacturacion = false;
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'No se pudo guardar.' });
                this.guardandoFacturacion = false;
            }
        });
    }

    openNewTimbrado(): void {
        const empId = this.facturacionEmpresa?.id ?? this.empresas[0]?.id;
        this.timbradoEdit = { empresa: empId ? { id: empId } : undefined, activo: true };
        this.dialogTimbrado = true;
    }

    editTimbrado(row: Timbrado): void {
        this.timbradoEdit = { ...row, empresa: row.empresa?.id ? { id: row.empresa.id } : undefined };
        this.dialogTimbrado = true;
    }

    guardarTimbrado(): void {
        if (!this.timbradoEdit.numeroTimbrado?.trim() || !this.timbradoEdit.fechaInicioVigencia || !this.timbradoEdit.fechaFinVigencia) {
            this.messageService.add({ severity: 'warn', summary: 'Datos requeridos', detail: 'Número, fecha inicio y fecha fin son obligatorios.' });
            return;
        }
        this.guardandoTimbrado = true;
        const req = this.timbradoEdit.id
            ? this.maestros.updateTimbrado(this.timbradoEdit.id, this.timbradoEdit)
            : this.maestros.createTimbrado(this.timbradoEdit as Timbrado).pipe(
                map(() => undefined as void)
            );
        req.subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Guardado', detail: this.timbradoEdit.id ? 'Timbrado actualizado.' : 'Timbrado creado.' });
                this.loadTimbrados();
                this.dialogTimbrado = false;
                this.guardandoTimbrado = false;
            },
            error: (err: { error?: { message?: string } }) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'No se pudo guardar.' });
                this.guardandoTimbrado = false;
            }
        });
    }

    eliminarTimbrado(row: Timbrado): void {
        if (!row.id) return;
        this.confirmationService.confirm({
            message: `¿Eliminar el timbrado ${row.numeroTimbrado}?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.maestros.deleteTimbrado(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Timbrado eliminado.' });
                        this.loadTimbrados();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'No se pudo eliminar.' })
                });
            }
        });
    }

    openNewSucursal(): void {
        const empId = this.facturacionEmpresa?.id ?? this.empresas[0]?.id;
        this.sucursalEdit = { empresa: empId ? { id: empId } : undefined, establecimiento: '001', puntoEmision: '001', activo: true };
        this.dialogSucursal = true;
    }

    editSucursal(row: Sucursal): void {
        this.sucursalEdit = { ...row, empresa: row.empresa?.id ? { id: row.empresa.id } : undefined };
        this.dialogSucursal = true;
    }

    guardarSucursal(): void {
        if (!this.sucursalEdit.codigo?.trim() || !this.sucursalEdit.nombre?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Datos requeridos', detail: 'Código y nombre son obligatorios.' });
            return;
        }
        this.guardandoSucursal = true;
        const req = this.sucursalEdit.id
            ? this.maestros.updateSucursal(this.sucursalEdit.id, this.sucursalEdit)
            : this.maestros.createSucursal(this.sucursalEdit as Sucursal).pipe(
                map(() => undefined as void)
            );
        req.subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Guardado', detail: this.sucursalEdit.id ? 'Sucursal actualizada.' : 'Sucursal creada.' });
                this.loadSucursales();
                this.dialogSucursal = false;
                this.guardandoSucursal = false;
            },
            error: (err: { error?: { message?: string } }) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'No se pudo guardar.' });
                this.guardandoSucursal = false;
            }
        });
    }

    /** Opciones para dropdown: Ninguna + sucursales (id, label). */
    get sucursalesConNinguna(): { id: number | null; label: string }[] {
        const ninguna: { id: number | null; label: string }[] = [{ id: null, label: 'Ninguna (usar valores de empresa)' }];
        const list = (this.sucursales ?? []).map((s) => ({
            id: s.id!,
            label: (s.nombre ?? s.codigo ?? '') + (s.establecimiento && s.puntoEmision ? ` (${s.establecimiento}-${s.puntoEmision})` : '')
        }));
        return ninguna.concat(list);
    }

    eliminarSucursal(row: Sucursal): void {
        if (!row.id) return;
        this.confirmationService.confirm({
            message: `¿Eliminar la sucursal "${row.nombre}"?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.maestros.deleteSucursal(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Sucursal eliminada.' });
                        this.loadSucursales();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'No se pudo eliminar.' })
                });
            }
        });
    }
}
