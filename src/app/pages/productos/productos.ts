import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProductoService } from '../service/producto.service';
import { Producto, Categoria, UnidadMedida, MaestrosService } from '../service/maestros.service';

/** Fila de la tabla de carga rápida de productos. */
export interface FilaCargaRapidaProducto {
    codigo?: string;
    nombre?: string;
    codigoBarras?: string;
    descripcion?: string;
    precioVenta?: number;
    unidadMedida?: UnidadMedida | null;
    categoria?: Categoria | null;
    ivaPorcentaje?: number;
    esCombo?: boolean;
    alquilable?: boolean;
    activo?: boolean;
}

@Component({
    selector: 'app-productos',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        ToastModule,
        ToolbarModule,
        ConfirmDialogModule,
        IconFieldModule,
        InputIconModule,
        TagModule,
        TabsModule
    ],
    templateUrl: './productos.component.html',
    styleUrls: ['./productos.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class ProductosComponent implements OnInit {
    @ViewChild('dt') dt!: Table;
    productos = signal<Producto[]>([]);
    loading = signal(false);
    filterTipo: 'todos' | 'producto' | 'servicio' | 'combo' | 'alquilable' = 'todos';
    tipoOpts = [
        { label: 'Todos', value: 'todos' },
        { label: 'Productos', value: 'producto' },
        { label: 'Combos', value: 'combo' },
        { label: 'Alquilables', value: 'alquilable' }
    ];

    /** Pestaña activa: 0 = listado, 1 = carga rápida */
    activeTab = 0;
    /** Filas para carga rápida de productos */
    lineasCargaRapida: FilaCargaRapidaProducto[] = [];
    /** Texto CSV pegado para importar (columnas: codigo, codigo_barras, nombre, precio_venta, categoria_id, unidad_medida_id, etc.) */
    csvPegado = '';
    categorias: Categoria[] = [];
    unidadesMedida: UnidadMedida[] = [];
    savingCargaRapida = signal(false);

    constructor(
        private productoService: ProductoService,
        private maestros: MaestrosService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.load();
        this.agregarFilaCargaRapida(); // una fila por defecto en carga rápida
        this.maestros.categorias().subscribe((c) => (this.categorias = c ?? []));
        this.maestros.unidadesMedida().subscribe((u) => {
            this.unidadesMedida = u ?? [];
            // Asignar unidad por defecto a la primera fila si no tiene
            if (this.unidadesMedida.length > 0 && this.lineasCargaRapida.length > 0 && !this.lineasCargaRapida[0].unidadMedida?.id) {
                this.lineasCargaRapida[0].unidadMedida = this.unidadesMedida[0];
            }
        });
    }

    load(): void {
        this.loading.set(true);
        this.productoService.list().subscribe({
            next: (list) => {
                this.productos.set(list ?? []);
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

    getTipoLabel(p: Producto): string {
        if (p.esCombo) return 'Combo';
        if (p.alquilable) return 'Alquilable';
        return 'Producto';
    }

    getTipoSeverity(p: Producto): 'success' | 'info' | 'warn' | 'secondary' {
        if (p.esCombo) return 'warn';
        if (p.alquilable) return 'info';
        return 'success';
    }

    confirmDelete(row: Producto): void {
        this.confirmationService.confirm({
            message: `¿Eliminar "${row.nombre}"?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(row.id!)
        });
    }

    delete(id: number): void {
        this.productoService.delete(id).subscribe({
            next: () => {
                this.productos.set(this.productos().filter((p) => p.id !== id));
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Producto eliminado.' });
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'No se pudo eliminar.' });
            }
        });
    }

    get filteredProductos(): Producto[] {
        const list = this.productos();
        if (this.filterTipo === 'todos') return list;
        if (this.filterTipo === 'combo') return list.filter((p) => p.esCombo);
        if (this.filterTipo === 'alquilable') return list.filter((p) => p.alquilable);
        return list;
    }

    // --- Carga rápida de productos ---

    agregarFilaCargaRapida(): void {
        const defaultUnidad = this.unidadesMedida.length > 0 ? this.unidadesMedida[0] : undefined;
        this.lineasCargaRapida.push({
            codigo: '',
            nombre: '',
            codigoBarras: '',
            precioVenta: 0,
            unidadMedida: defaultUnidad ?? null,
            categoria: null,
            ivaPorcentaje: 10,
            esCombo: false,
            alquilable: false,
            activo: true
        });
    }

    /**
     * Parsea CSV con cabecera (codigo, codigo_barras, nombre, descripcion, precio_venta, costo, categoria_id, unidad_medida_id, iva_porcentaje, es_combo, alquilable, activo).
     * Rellena la tabla de carga rápida; categoria_id y unidad_medida_id se resuelven contra listas cargadas.
     */
    cargarDesdeCsv(): void {
        const text = this.csvPegado?.trim();
        if (!text) {
            this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'Pegá el contenido del CSV en el recuadro.' });
            return;
        }
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
            this.messageService.add({ severity: 'warn', summary: 'CSV inválido', detail: 'El CSV debe tener una línea de cabecera y al menos una fila de datos.' });
            return;
        }
        const header = this.parseCsvLine(lines[0]);
        const codigoIdx = header.findIndex((h) => /^codigo$/i.test(h?.trim() ?? ''));
        const codigoBarrasIdx = header.findIndex((h) => /^codigo_barras$/i.test(h?.trim() ?? ''));
        const nombreIdx = header.findIndex((h) => /^nombre$/i.test(h?.trim() ?? ''));
        const descripcionIdx = header.findIndex((h) => /^descripcion$/i.test(h?.trim() ?? ''));
        const precioVentaIdx = header.findIndex((h) => /^precio_venta$/i.test(h?.trim() ?? ''));
        const categoriaIdIdx = header.findIndex((h) => /^categoria_id$/i.test(h?.trim() ?? ''));
        const unidadMedidaIdIdx = header.findIndex((h) => /^unidad_medida_id$/i.test(h?.trim() ?? ''));
        const ivaIdx = header.findIndex((h) => /^iva_porcentaje$/i.test(h?.trim() ?? ''));
        const esComboIdx = header.findIndex((h) => /^es_combo$/i.test(h?.trim() ?? ''));
        const alquilableIdx = header.findIndex((h) => /^alquilable$/i.test(h?.trim() ?? ''));
        const activoIdx = header.findIndex((h) => /^activo$/i.test(h?.trim() ?? ''));

        if (nombreIdx < 0) {
            this.messageService.add({ severity: 'warn', summary: 'CSV inválido', detail: 'Falta la columna "nombre" en la cabecera.' });
            return;
        }

        const parsed: FilaCargaRapidaProducto[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCsvLine(lines[i]);
            const nombre = (values[nombreIdx] ?? '').trim();
            if (!nombre) continue;
            const catId = categoriaIdIdx >= 0 ? this.parseNum(values[categoriaIdIdx]) : null;
            const umId = unidadMedidaIdIdx >= 0 ? this.parseNum(values[unidadMedidaIdIdx]) : null;
            parsed.push({
                codigo: codigoIdx >= 0 ? (values[codigoIdx] ?? '').trim() || undefined : undefined,
                nombre,
                codigoBarras: codigoBarrasIdx >= 0 ? (values[codigoBarrasIdx] ?? '').trim() || undefined : undefined,
                descripcion: descripcionIdx >= 0 ? (values[descripcionIdx] ?? '').trim() || undefined : undefined,
                precioVenta: precioVentaIdx >= 0 ? this.parseNum(values[precioVentaIdx]) ?? 0 : 0,
                categoria: catId != null ? (this.categorias.find((c) => c.id === catId) ?? null) : null,
                unidadMedida: umId != null ? (this.unidadesMedida.find((u) => u.id === umId) ?? null) : (this.unidadesMedida[0] ?? null),
                ivaPorcentaje: ivaIdx >= 0 ? (this.parseNum(values[ivaIdx]) ?? 10) : 10,
                esCombo: esComboIdx >= 0 ? this.parseBool(values[esComboIdx]) : false,
                alquilable: alquilableIdx >= 0 ? this.parseBool(values[alquilableIdx]) : false,
                activo: activoIdx >= 0 ? this.parseBool(values[activoIdx]) : true
            });
        }
        if (parsed.length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Sin filas', detail: 'No se encontraron filas con nombre válido.' });
            return;
        }
        this.lineasCargaRapida = parsed;
        this.messageService.add({ severity: 'success', summary: 'CSV cargado', detail: `${parsed.length} producto(s) listos para revisar y guardar.` });
    }

    /** Parsea una línea CSV respetando comillas dobles. */
    private parseCsvLine(line: string): string[] {
        const out: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                inQuotes = !inQuotes;
            } else if ((c === ',' && !inQuotes) || (c === ';' && !inQuotes)) {
                out.push(cur);
                cur = '';
            } else {
                cur += c;
            }
        }
        out.push(cur);
        return out.map((s) => s.trim().replace(/^"|"$/g, ''));
    }

    private parseNum(v: string | undefined): number | null {
        if (v == null || v === '') return null;
        const n = Number(v.replace(/,/g, '.').replace(/\s/g, ''));
        return Number.isNaN(n) ? null : n;
    }

    private parseBool(v: string | undefined): boolean {
        if (v == null || v === '') return false;
        const t = (v + '').trim().toLowerCase();
        return t === 'true' || t === '1' || t === 'sí' || t === 'si' || t === 'yes';
    }

    quitarFilaCargaRapida(index: number): void {
        this.lineasCargaRapida.splice(index, 1);
    }

    /** Filas válidas para guardar (nombre no vacío y unidad seleccionada). */
    get lineasCargaRapidaValidas(): FilaCargaRapidaProducto[] {
        return this.lineasCargaRapida.filter(
            (f) => (f.nombre?.trim() ?? '').length > 0 && f.unidadMedida?.id != null
        );
    }

    guardarCargaRapida(): void {
        const validas = this.lineasCargaRapidaValidas;
        if (validas.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Sin datos',
                detail: 'Completá al menos una fila con nombre y unidad de medida.'
            });
            return;
        }
        this.savingCargaRapida.set(true);
        let ok = 0;
        let err = 0;
        const total = validas.length;
        let completed = 0;
        const onFinish = (): void => {
            this.savingCargaRapida.set(false);
            this.load();
            if (err === 0) {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Se crearon ${ok} producto(s).`
                });
                this.lineasCargaRapida = [];
                this.agregarFilaCargaRapida();
                this.activeTab = 0;
            } else {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Carga parcial',
                    detail: `Creados: ${ok}. Errores: ${err}.`
                });
            }
        };
        validas.forEach((fila) => {
            const p: Producto = {
                codigo: fila.codigo?.trim() || undefined,
                nombre: fila.nombre?.trim(),
                codigoBarras: fila.codigoBarras?.trim() || undefined,
                descripcion: fila.descripcion?.trim() || undefined,
                precioVenta: fila.precioVenta ?? 0,
                unidadMedida: fila.unidadMedida ?? undefined,
                categoria: fila.categoria ?? undefined,
                activo: fila.activo !== false,
                esCombo: fila.esCombo === true,
                alquilable: fila.alquilable === true,
                ivaPorcentaje: fila.ivaPorcentaje ?? 10
            };
            this.productoService.create(p).subscribe({
                next: () => { ok++; },
                error: () => { err++; },
                complete: () => {
                    completed++;
                    if (completed === total) onFinish();
                }
            });
        });
    }
}
