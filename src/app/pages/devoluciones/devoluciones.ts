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
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DevolucionService, DevolucionVenta, DevolucionVentaDetalle } from '../service/devolucion.service';
import { DocumentoVentaService, DocumentoVenta, DocumentoVentaDetalle } from '../service/documento-venta.service';

@Component({
    selector: 'app-devoluciones',
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
        InputIconModule,
        TagModule
    ],
    templateUrl: './devoluciones.component.html',
    styleUrls: ['./devoluciones.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class DevolucionesComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    devoluciones = signal<DevolucionVenta[]>([]);
    documentos: DocumentoVenta[] = [];
    selectedDocumento: DocumentoVenta | null = null;
    lineasDevolucion: { documentoVentaDetalle?: { id: number }; cantidad?: number; cantidadDevuelta?: number; motivo?: string; descripcion?: string; nroLinea?: number }[] = [];
    dialog = false;
    devolucion: DevolucionVenta = {};
    loading = signal(false);

    constructor(
        private devolucionService: DevolucionService,
        private documentoService: DocumentoVentaService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.load();
        this.documentoService.list().subscribe((d) => (this.documentos = (d ?? []).filter((x) => x.estado === 'EMITIDO')));
    }

    load(): void {
        this.loading.set(true);
        this.devolucionService.list().subscribe({
            next: (list) => {
                this.devoluciones.set(list ?? []);
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar.' });
                this.loading.set(false);
            }
        });
    }

    onDocumentoSelect(): void {
        this.lineasDevolucion = [];
        const doc = this.selectedDocumento;
        if (!doc?.id) return;
        this.devolucion.documentoVenta = { id: doc.id };
        this.documentoService.getById(doc.id).subscribe({
            next: (d) => {
                this.lineasDevolucion = (d.detalle ?? []).map((l) => ({
                    documentoVentaDetalle: { id: l.id! },
                    cantidad: l.cantidad,
                    cantidadDevuelta: 0,
                    motivo: '',
                    descripcion: l.descripcion,
                    nroLinea: l.nroLinea
                }));
            }
        });
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (estado) {
            case 'APROBADA': return 'success';
            case 'RECHAZADA': return 'danger';
            case 'PENDIENTE': return 'warn';
            default: return 'secondary';
        }
    }

    openNew(): void {
        this.devolucion = { fechaDevolucion: new Date().toISOString().slice(0, 10), estado: 'PENDIENTE' };
        this.selectedDocumento = null;
        this.lineasDevolucion = [];
        this.dialog = true;
    }

    hideDialog(): void {
        this.dialog = false;
        this.devolucion = {};
    }

    onDialogHide(): void {
        this.devolucion = {};
        this.selectedDocumento = null;
        this.lineasDevolucion = [];
    }

    save(): void {
        if (!this.devolucion.documentoVenta?.id) {
            this.messageService.add({ severity: 'warn', summary: 'Documento requerido', detail: 'Seleccione un documento.' });
            return;
        }
        const detalle: DevolucionVentaDetalle[] = this.lineasDevolucion
            .filter((l) => (l.cantidadDevuelta ?? 0) > 0)
            .map((l) => ({
                documentoVentaDetalle: l.documentoVentaDetalle!,
                cantidadDevuelta: l.cantidadDevuelta!,
                motivo: l.motivo ?? ''
            }));
        if (detalle.length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Detalle', detail: 'Indique al menos una línea con cantidad a devolver.' });
            return;
        }
        this.devolucionService.create({ ...this.devolucion, detalle }).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Devolución creada.' });
                this.hideDialog();
                this.load();
            },
            error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Error al guardar.' })
        });
    }

    aprobar(row: DevolucionVenta): void {
        this.confirmationService.confirm({
            message: '¿Aprobar esta devolución? ¿Generar nota de crédito?',
            header: 'Aprobar',
            icon: 'pi pi-check',
            accept: () => {
                this.devolucionService.aprobar(row.id!, true).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Aprobada', detail: 'Devolución aprobada.' });
                        this.load();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo aprobar.' })
                });
            }
        });
    }

    rechazar(row: DevolucionVenta): void {
        this.confirmationService.confirm({
            message: '¿Rechazar esta devolución?',
            header: 'Rechazar',
            icon: 'pi pi-times',
            accept: () => {
                this.devolucionService.rechazar(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Rechazada', detail: 'Devolución rechazada.' });
                        this.load();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo rechazar.' })
                });
            }
        });
    }
}
