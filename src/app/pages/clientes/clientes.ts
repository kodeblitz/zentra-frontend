import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ClienteService, Cliente } from '../service/cliente.service';
import { MaestrosService, CondicionPago } from '../service/maestros.service';
import {
    CODIGOS_PAIS_CELULAR,
    CODIGO_PAIS_DEFAULT,
    parsearCelularGuardado,
    normalizarCelularParaGuardar
} from '../../core/telefono.util';

@Component({
    selector: 'app-clientes',
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
        CheckboxModule,
        ToastModule,
        ToolbarModule,
        ConfirmDialogModule,
        IconFieldModule,
        InputIconModule,
        TagModule
    ],
    templateUrl: './clientes.component.html',
    styleUrls: ['./clientes.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class ClientesComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    clientes = signal<Cliente[]>([]);
    condicionesPago: CondicionPago[] = [];
    dialog = false;
    editing = false;
    submitted = false;
    cliente: Cliente = {};
    selectedCondicionPago: CondicionPago | null = null;
    /** Selector de celular: código de país (ej. +595) y número local (solo dígitos). */
    codigoPaisCelular = CODIGO_PAIS_DEFAULT;
    celularNumero = '';
    /** Copia mutable para p-select [options]. */
    codigosPaisCelular: { code: string; label: string }[] = [...CODIGOS_PAIS_CELULAR];
    loading = signal(false);

    constructor(
        private clienteService: ClienteService,
        private maestros: MaestrosService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.load();
        this.maestros.condicionesPago().subscribe((list) => (this.condicionesPago = list));
    }

    load(): void {
        this.loading.set(true);
        this.clienteService.list().subscribe({
            next: (list) => {
                this.clientes.set(list ?? []);
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista.' });
                this.loading.set(false);
            }
        });
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    getCondicionPagoNombre(id: number | undefined): string {
        if (id == null) return '-';
        const c = this.condicionesPago.find((x) => x.id === id);
        return c?.nombre ?? String(id);
    }

    openNew(): void {
        this.cliente = { activo: true };
        this.selectedCondicionPago = null;
        this.codigoPaisCelular = CODIGO_PAIS_DEFAULT;
        this.celularNumero = '';
        this.editing = false;
        this.submitted = false;
        this.dialog = true;
    }

    edit(row: Cliente): void {
        this.cliente = { ...row, condicionPago: row.condicionPago ? { id: row.condicionPago.id } : undefined };
        this.selectedCondicionPago = row.condicionPago?.id != null
            ? this.condicionesPago.find((c) => c.id === row.condicionPago!.id) ?? null
            : null;
        const { codigoPais, numero } = parsearCelularGuardado(row.celular);
        this.codigoPaisCelular = codigoPais;
        this.celularNumero = numero;
        this.editing = true;
        this.submitted = false;
        this.dialog = true;
    }

    onRucBlur(): void {
        const ruc = this.cliente.ruc?.trim();
        if (!ruc) return;
        this.clienteService.calcularDv(ruc).subscribe((res) => {
            if (res.dv != null) this.cliente.dv = String(res.dv);
        });
    }

    hideDialog(): void {
        this.dialog = false;
        this.submitted = false;
    }

    onDialogHide(): void {
        this.cliente = {};
        this.codigoPaisCelular = CODIGO_PAIS_DEFAULT;
        this.celularNumero = '';
    }

    save(): void {
        this.submitted = true;
        if (!this.cliente.razonSocial?.trim()) return;
        const celularNormalizado = normalizarCelularParaGuardar(this.codigoPaisCelular, this.celularNumero);
        const payload: Cliente = {
            ...this.cliente,
            celular: celularNormalizado || undefined,
            condicionPago: this.selectedCondicionPago ? { id: this.selectedCondicionPago.id } : undefined
        };
        const req = this.editing && this.cliente.id
            ? this.clienteService.update({ ...payload, id: this.cliente.id })
            : this.clienteService.create(payload);
        req.subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: this.editing ? 'Cliente actualizado.' : 'Cliente creado.' });
                this.hideDialog();
                this.load();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar.' });
            }
        });
    }

    confirmDelete(row: Cliente): void {
        this.confirmationService.confirm({
            message: `¿Eliminar el cliente "${row.razonSocial}"?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(row.id!)
        });
    }

    delete(id: number): void {
        this.clienteService.delete(id).subscribe({
            next: () => {
                this.clientes.set(this.clientes().filter((c) => c.id !== id));
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Cliente eliminado.' });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar.' });
            }
        });
    }
}
