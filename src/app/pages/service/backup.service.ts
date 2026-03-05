import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';

export interface BackupStatus {
    cloudConfigured: boolean;
    canUseCloudBackup: boolean;
}

@Injectable({ providedIn: 'root' })
export class BackupService {
    private readonly base = API_BASE_URL;

    constructor(private http: HttpClient) {}

    getStatus(): Observable<BackupStatus> {
        return this.http.get<BackupStatus>(`${this.base}/backup/status`);
    }

    /** Crea el backup y devuelve el blob para descargar. */
    createBackup(): Observable<Blob> {
        return this.http.post(`${this.base}/backup/create`, null, { responseType: 'blob' });
    }

    uploadToCloud(): Observable<void> {
        return this.http.post<void>(`${this.base}/backup/upload`, null);
    }

    restore(file: File): Observable<void> {
        const form = new FormData();
        form.append('file', file);
        return this.http.post<void>(`${this.base}/backup/restore`, form);
    }
}
