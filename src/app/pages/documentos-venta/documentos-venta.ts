import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DocumentoVentaService, DocumentoVenta } from '../service/documento-venta.service';

@Component({
    selector: 'app-documentos-venta',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        ToastModule,
        ToolbarModule,
        ConfirmDialogModule,
        IconFieldModule,
        InputIconModule,
        TagModule
    ],
    templateUrl: './documentos-venta.component.html',
    styleUrls: ['./documentos-venta.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class DocumentosVentaComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    documentos = signal<DocumentoVenta[]>([]);
    clienteNombreCache: Record<number, string> = {};
    loading = signal(false);

    constructor(
        private docService: DocumentoVentaService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.docService.list().subscribe({
            next: (list) => {
                const items = list ?? [];
                this.documentos.set(items);
                items.forEach((d) => {
                    const cliente = d.cliente as unknown as { id?: number; razonSocial?: string };
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

    openNew(): void {
        this.router.navigate(['/pages/documentos-venta/nuevo']);
    }

    ver(row: DocumentoVenta): void {
        if (row.id) this.router.navigate(['/pages/documentos-venta/ver', row.id]);
    }

    edit(row: DocumentoVenta): void {
        if (row.estado !== 'BORRADOR') {
            this.messageService.add({ severity: 'warn', summary: 'Solo borradores', detail: 'Solo se pueden editar documentos en BORRADOR.' });
            return;
        }
        this.router.navigate(['/pages/documentos-venta/editar', row.id]);
    }

    emitir(row: DocumentoVenta): void {
        this.confirmationService.confirm({
            message: '¿Emitir este documento?',
            header: 'Confirmar',
            icon: 'pi pi-send',
            accept: () => {
                this.docService.emitir(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Emitido', detail: 'Documento emitido.' });
                        this.load();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo emitir.' })
                });
            }
        });
    }

    anular(row: DocumentoVenta): void {
        this.confirmationService.confirm({
            message: '¿Anular este documento?',
            header: 'Confirmar',
            icon: 'pi pi-times',
            accept: () => {
                this.docService.anular(row.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Anulado', detail: 'Documento anulado.' });
                        this.load();
                    },
                    error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo anular.' })
                });
            }
        });
    }
}
