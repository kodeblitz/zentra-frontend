import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api-config';

/** Claves de módulos que coinciden con el backend (zentra.feature.<key>). */
export const FEATURE_KEYS = {
    clientes: 'clientes',
    prospectos: 'prospectos',
    documentos_venta: 'documentos_venta',
    pdv: 'pdv',
    presupuestos: 'presupuestos',
    pedidos: 'pedidos',
    alquileres: 'alquileres',
    devoluciones: 'devoluciones',
    creditos: 'creditos',
    pagos: 'pagos',
    caja: 'caja',
    cartera: 'cartera',
    productos: 'productos',
    inventario: 'inventario',
    parametricos: 'parametricos',
    compras: 'compras',
    gastos: 'gastos'
} as const;

export type FeatureKey = keyof typeof FEATURE_KEYS;

@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
    private readonly base = API_BASE_URL;

    /** Mapa de módulo -> habilitado. Vacío hasta que se llame load(). */
    private flags = signal<Record<string, boolean>>({});
    /** true después de la primera carga exitosa (o error). */
    private loaded = signal(false);

    /** Flags actuales (lectura). */
    readonly currentFlags = computed(() => this.flags());
    /** Si ya se cargaron los flags desde el backend. */
    readonly isLoaded = computed(() => this.loaded());

    constructor(private http: HttpClient) {}

    /**
     * Carga los feature flags desde el backend. Requiere estar autenticado.
     * Llamar después del login o al iniciar el layout si ya hay sesión.
     */
    load(): void {
        this.http.get<Record<string, boolean>>(`${this.base}/feature-flags`).subscribe({
            next: (map) => {
                this.flags.set(map ?? {});
                this.loaded.set(true);
            },
            error: () => {
                this.loaded.set(true);
                this.flags.set({});
            }
        });
    }

    /**
     * Indica si un módulo está habilitado.
     * Si aún no se cargaron los flags, se considera habilitado para no ocultar nada durante la carga.
     */
    isEnabled(key: string): boolean {
        const map = this.flags();
        if (Object.keys(map).length === 0) return true;
        return map[key] !== false;
    }

    /** Resetea el estado (p. ej. al cerrar sesión). */
    reset(): void {
        this.flags.set({});
        this.loaded.set(false);
    }
}
