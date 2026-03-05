import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class ApiService {
    private readonly base = API_BASE_URL;

    constructor(private http: HttpClient) {}

    get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
        let httpParams = new HttpParams();
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null) httpParams = httpParams.set(k, String(v));
            });
        }
        return this.http.get<T>(`${this.base}${path}`, { params: httpParams });
    }

    post<T>(path: string, body: unknown): Observable<T> {
        return this.http.post<T>(`${this.base}${path}`, body);
    }

    put<T>(path: string, body: unknown): Observable<T> {
        return this.http.put<T>(`${this.base}${path}`, body);
    }

    delete(path: string): Observable<boolean> {
        return this.http.delete<boolean>(`${this.base}${path}`);
    }

    getBlob(path: string): Observable<Blob> {
        return this.http.get(`${this.base}${path}`, { responseType: 'blob' });
    }

    postFormData<T>(path: string, formData: FormData): Observable<T> {
        return this.http.post<T>(`${this.base}${path}`, formData);
    }
}
