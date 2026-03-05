import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export type EntidadImportacion = 'clientes' | 'productos' | 'prospectos' | 'categorias' | 'unidades-medida' | 'depositos';

export interface ImportResult {
    importados: number;
    errores: { fila: number; mensaje: string }[];
}

const PATHS: Record<EntidadImportacion, string> = {
    'clientes': '/clientes',
    'productos': '/productos',
    'prospectos': '/prospectos',
    'categorias': '/categorias',
    'unidades-medida': '/unidades-medida',
    'depositos': '/depositos'
};

@Injectable({ providedIn: 'root' })
export class ImportacionService {
    constructor(private api: ApiService) {}

    getTemplateBlob(entidad: EntidadImportacion): Observable<Blob> {
        return this.api.getBlob(`${PATHS[entidad]}/import/template`);
    }

    importCsv(entidad: EntidadImportacion, file: File, codigoPrefijo?: string): Observable<ImportResult> {
        const form = new FormData();
        form.append('file', file);
        if (codigoPrefijo != null && codigoPrefijo !== '') {
            form.append('codigoPrefijo', codigoPrefijo);
        }
        return this.api.postFormData<ImportResult>(`${PATHS[entidad]}/import`, form);
    }

    getNombreArchivo(entidad: EntidadImportacion): string {
        const names: Record<EntidadImportacion, string> = {
            'clientes': 'plantilla_clientes.csv',
            'productos': 'plantilla_productos.csv',
            'prospectos': 'plantilla_prospectos.csv',
            'categorias': 'plantilla_categorias.csv',
            'unidades-medida': 'plantilla_unidades_medida.csv',
            'depositos': 'plantilla_depositos.csv'
        };
        return names[entidad];
    }
}
