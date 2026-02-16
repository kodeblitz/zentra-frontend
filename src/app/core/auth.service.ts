import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { API_BASE_URL } from './api-config';

const STORAGE_TOKEN = 'zentra_token';
const STORAGE_USER = 'zentra_user';

export interface UsuarioInfo {
    id: number;
    username: string;
    nombre?: string;
    email?: string;
    roles?: string[];
}

export interface LoginResponse {
    accessToken: string;
    expiresIn: number;
    tokenType: string;
    usuario: UsuarioInfo;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly base = API_BASE_URL;

    private token = signal<string | null>(this.getStoredToken());
    private user = signal<UsuarioInfo | null>(this.getStoredUser());

    currentUser = computed(() => this.user());
    /** Solo considerado logueado si hay un token no vacío. */
    isLoggedIn = computed(() => {
        const t = this.token();
        return typeof t === 'string' && t.length > 0;
    });

    constructor(
        private http: HttpClient,
        private router: Router
    ) {}

    login(username: string, password: string): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${this.base}/auth/login`, { username, password }).pipe(
            tap((res) => {
                if (res?.accessToken && res?.usuario) {
                    this.setSession(res.accessToken, res.usuario);
                }
            })
        );
    }

    logout(): void {
        localStorage.removeItem(STORAGE_TOKEN);
        localStorage.removeItem(STORAGE_USER);
        this.token.set(null);
        this.user.set(null);
        this.router.navigate(['/auth/login']);
    }

    getToken(): string | null {
        return this.token() ?? this.getStoredToken();
    }

    private setSession(accessToken: string, usuario: UsuarioInfo): void {
        localStorage.setItem(STORAGE_TOKEN, accessToken);
        localStorage.setItem(STORAGE_USER, JSON.stringify(usuario));
        this.token.set(accessToken);
        this.user.set(usuario);
    }

    private getStoredToken(): string | null {
        try {
            const t = localStorage.getItem(STORAGE_TOKEN);
            return t && t.length > 0 ? t : null;
        } catch {
            return null;
        }
    }

    private getStoredUser(): UsuarioInfo | null {
        try {
            const raw = localStorage.getItem(STORAGE_USER);
            if (!raw) return null;
            return JSON.parse(raw) as UsuarioInfo;
        } catch {
            return null;
        }
    }

    /** Restaura estado desde storage (p. ej. tras recarga). */
    restoreSession(): void {
        const t = this.getStoredToken();
        const u = this.getStoredUser();
        if (t) this.token.set(t);
        if (u) this.user.set(u);
    }
}
