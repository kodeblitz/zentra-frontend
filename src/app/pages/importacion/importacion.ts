import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FileUploadModule } from 'primeng/fileupload';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ImportacionService, EntidadImportacion, ImportResult } from '../service/importacion.service';

@Component({
    selector: 'app-importacion',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        CardModule,
        InputTextModule,
        SelectModule,
        FileUploadModule,
        TableModule,
        ToastModule
    ],
    templateUrl: './importacion.component.html',
    styleUrls: ['./importacion.component.scss'],
    providers: [MessageService]
})
export class ImportacionComponent {
    /** Orden correlativo: primero paramétricos (otros dependen), luego clientes/prospectos, luego productos. */
    entidad: EntidadImportacion = 'unidades-medida';
    opcionesEntidad: { label: string; value: EntidadImportacion }[] = [
        { label: '1. Unidades de medida', value: 'unidades-medida' },
        { label: '2. Categorías', value: 'categorias' },
        { label: '3. Depósitos', value: 'depositos' },
        { label: '4. Clientes', value: 'clientes' },
        { label: '5. Prospectos', value: 'prospectos' },
        { label: '6. Productos', value: 'productos' }
    ];
    /** Prefijo/seed opcional para generar códigos automáticos cuando el CSV deja el código vacío (ej. CLI → CLI001, CLI002). */
    codigoPrefijo = '';
    loadingTemplate = signal(false);
    loadingImport = signal(false);
    result = signal<ImportResult | null>(null);
    selectedFile: File | null = null;

    constructor(
        private importacionService: ImportacionService,
        private messageService: MessageService
    ) {}

    descargarPlantilla(): void {
        this.loadingTemplate.set(true);
        this.importacionService.getTemplateBlob(this.entidad).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = this.importacionService.getNombreArchivo(this.entidad);
                a.click();
                URL.revokeObjectURL(url);
                this.messageService.add({ severity: 'success', summary: 'Plantilla descargada', detail: a.download });
                this.loadingTemplate.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo descargar la plantilla.' });
                this.loadingTemplate.set(false);
            }
        });
    }

    onFileSelect(event: { currentFiles: File[] }): void {
        this.selectedFile = event.currentFiles?.[0] ?? null;
        this.result.set(null);
    }

    importar(): void {
        if (!this.selectedFile) {
            this.messageService.add({ severity: 'warn', summary: 'Archivo requerido', detail: 'Seleccione un archivo CSV.' });
            return;
        }
        this.loadingImport.set(true);
        this.result.set(null);
        const prefijo = this.codigoPrefijo?.trim() || undefined;
        this.importacionService.importCsv(this.entidad, this.selectedFile, prefijo).subscribe({
            next: (res) => {
                this.result.set(res);
                const msg = res.errores?.length
                    ? `Importados: ${res.importados}. Errores: ${res.errores.length} fila(s).`
                    : `Se importaron ${res.importados} registro(s) correctamente.`;
                this.messageService.add({ severity: res.errores?.length ? 'warn' : 'success', summary: 'Importación', detail: msg });
                this.loadingImport.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falló la importación.' });
                this.loadingImport.set(false);
            }
        });
    }

    clearResult(): void {
        this.result.set(null);
        this.selectedFile = null;
    }
}
