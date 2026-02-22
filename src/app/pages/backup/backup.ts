import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { BackupService, BackupStatus } from '../service/backup.service';

@Component({
    selector: 'app-backup',
    standalone: true,
    imports: [CommonModule, CardModule, ButtonModule, FileUploadModule, ToastModule],
    templateUrl: './backup.component.html',
    styleUrls: ['./backup.component.scss'],
    providers: [MessageService]
})
export class BackupComponent implements OnInit {
    status = signal<BackupStatus | null>(null);
    loadingCreate = signal(false);
    loadingUpload = signal(false);
    loadingRestore = signal(false);
    selectedFile = signal<File | null>(null);

    constructor(
        private backupService: BackupService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.backupService.getStatus().subscribe({
            next: (s) => this.status.set(s),
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el estado del respaldo.' })
        });
    }

    crearYDescargar(): void {
        this.loadingCreate.set(true);
        this.backupService.createBackup().subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'zentra-backup.zip';
                a.click();
                URL.revokeObjectURL(url);
                this.messageService.add({ severity: 'success', summary: 'Backup creado', detail: 'Se descargó zentra-backup.zip' });
                this.loadingCreate.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err?.error?.error ?? err?.message ?? 'No se pudo crear el backup.'
                });
                this.loadingCreate.set(false);
            }
        });
    }

    subirANube(): void {
        this.loadingUpload.set(true);
        this.backupService.uploadToCloud().subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Backup en la nube', detail: 'El respaldo se subió correctamente.' });
                this.loadingUpload.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err?.error?.error ?? err?.message ?? 'No se pudo subir el backup.'
                });
                this.loadingUpload.set(false);
            }
        });
    }

    onFileSelect(event: { currentFiles: File[] }): void {
        this.selectedFile.set(event.currentFiles?.[0] ?? null);
    }

    restaurar(): void {
        const file = this.selectedFile();
        if (!file) return;
        this.loadingRestore.set(true);
        this.backupService.restore(file).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Restauración completada', detail: 'Reinicie la sesión si es necesario.' });
                this.selectedFile.set(null);
                this.loadingRestore.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err?.error?.error ?? err?.message ?? 'No se pudo restaurar.'
                });
                this.loadingRestore.set(false);
            }
        });
    }
}
