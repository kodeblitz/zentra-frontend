import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LayoutService, layoutConfig } from '../layout/service/layout.service';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'zentra_theme';

export interface ThemePreferenciaDTO {
    preset?: string;
    primary?: string;
    surface?: string | null;
    darkTheme?: boolean;
    menuMode?: string;
}

export interface PreferenciasDTO {
    theme?: ThemePreferenciaDTO;
}

@Injectable({ providedIn: 'root' })
export class ThemePreferenceService {
    private layout = inject(LayoutService);
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private platformId = inject(PLATFORM_ID);

    private saveToApiTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly DEBOUNCE_MS = 800;

    /**
     * Carga el tema: primero desde localStorage; si no hay, desde la API.
     * Debe llamarse al iniciar la app (p. ej. en AppLayout ngOnInit).
     */
    loadAndApply(): void {
        if (!isPlatformBrowser(this.platformId)) return;

        const fromLocal = this.loadFromLocalStorage();
        if (fromLocal) {
            this.layout.layoutConfig.set(fromLocal);
            this.layout.toggleDarkMode(fromLocal);
            return;
        }

        if (this.auth.isLoggedIn()) {
            this.api.get<PreferenciasDTO>('/auth/me/preferencias').subscribe({
                next: (dto) => {
                    if (dto?.theme) {
                        const config = this.themeToLayoutConfig(dto.theme);
                        this.layout.layoutConfig.set(config);
                        this.layout.toggleDarkMode(config);
                        this.saveToLocalStorage(config);
                    } else {
                        this.layout.toggleDarkMode(this.layout.layoutConfig());
                    }
                },
                error: () => {
                    this.layout.toggleDarkMode(this.layout.layoutConfig());
                }
            });
        } else {
            this.layout.toggleDarkMode(this.layout.layoutConfig());
        }
    }

    /**
     * Persiste el tema actual: siempre en localStorage; en la BD con debounce.
     * Llamar cuando cambie el tema (LayoutService puede invocarlo desde un effect).
     */
    persist(): void {
        if (!isPlatformBrowser(this.platformId)) return;

        const config = this.layout.layoutConfig();
        this.saveToLocalStorage(config);

        if (this.saveToApiTimeout) clearTimeout(this.saveToApiTimeout);
        if (!this.auth.isLoggedIn()) return;

        this.saveToApiTimeout = setTimeout(() => {
            this.saveToApiTimeout = null;
            this.api.put('/auth/me/preferencias', { theme: this.layoutConfigToTheme(config) }).subscribe({
                error: () => {}
            });
        }, this.DEBOUNCE_MS);
    }

    private loadFromLocalStorage(): layoutConfig | null {
        try {
            const s = localStorage.getItem(STORAGE_KEY);
            if (!s) return null;
            const parsed = JSON.parse(s) as layoutConfig;
            if (parsed && (parsed.preset != null || parsed.darkTheme != null)) return parsed;
        } catch {}
        return null;
    }

    private saveToLocalStorage(config: layoutConfig): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                preset: config.preset,
                primary: config.primary,
                surface: config.surface,
                darkTheme: config.darkTheme,
                menuMode: config.menuMode
            }));
        } catch {}
    }

    private layoutConfigToTheme(c: layoutConfig): ThemePreferenciaDTO {
        return {
            preset: c.preset,
            primary: c.primary ?? undefined,
            surface: c.surface ?? undefined,
            darkTheme: c.darkTheme,
            menuMode: c.menuMode
        };
    }

    private themeToLayoutConfig(t: ThemePreferenciaDTO): layoutConfig {
        return {
            preset: t.preset ?? 'Aura',
            primary: t.primary ?? 'emerald',
            surface: t.surface ?? null,
            darkTheme: t.darkTheme ?? false,
            menuMode: t.menuMode ?? 'static'
        };
    }
}
