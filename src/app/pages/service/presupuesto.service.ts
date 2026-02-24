import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';

export interface PresupuestoDetalle {
    id?: number;
    nroLinea?: number;
    producto?: { id: number };
    descripcion?: string;
    cantidad?: number;
    precioUnitario?: number;
    totalLinea?: number;
}

export interface Presupuesto {
    id?: number;
    cliente?: { id: number };
    numero?: string;
    fechaEmision?: string;
    fechaValidez?: string;
    fechaEnvio?: string;
    estado?: string;
    tipoPedido?: string;
    direccionEntrega?: string;
    telefonoContacto?: string;
    observaciones?: string;
    subtotal?: number;
    total?: number;
    moneda?: { id: number };
    detalle?: PresupuestoDetalle[];
    /** ID del pedido generado al convertir (cuando estado=CONVERTIDO). */
    pedidoId?: number;
    /** Factura asociada vía pedido (cuando el presupuesto está finalizado y facturado). */
    documentoVenta?: { id: number; numero?: string; estado?: string };
}

export interface EnviarPresupuestoDTO {
    link: string;
    codigoSeguridad: string;
}

@Injectable({ providedIn: 'root' })
export class PresupuestoService {
    private path = '/presupuestos';

    constructor(private api: ApiService) {}

    list(): Observable<Presupuesto[]> {
        return this.api.get<Presupuesto[]>(this.path);
    }

    listPorCliente(clienteId: number): Observable<Presupuesto[]> {
        return this.api.get<Presupuesto[]>(`${this.path}/por-cliente/${clienteId}`);
    }

    listPorEstado(estado: string): Observable<Presupuesto[]> {
        return this.api.get<Presupuesto[]>(`${this.path}/por-estado`, { estado });
    }

    getById(id: number): Observable<Presupuesto> {
        return this.api.get<Presupuesto>(`${this.path}/${id}`);
    }

    create(item: Presupuesto): Observable<void> {
        return this.api.post<void>(this.path, item);
    }

    update(item: Presupuesto): Observable<void> {
        return this.api.put<void>(this.path, item);
    }

    delete(id: number): Observable<boolean> {
        return this.api.delete(`${this.path}/${id}`);
    }

    /** Envía el presupuesto y devuelve enlace público y código de seguridad. */
    enviar(id: number): Observable<EnviarPresupuestoDTO> {
        return this.api.post<EnviarPresupuestoDTO>(`${this.path}/${id}/enviar`, {});
    }

    /** Obtiene enlace y código para compartir (presupuestos ENVIADOS). */
    getDatosEnvio(id: number): Observable<EnviarPresupuestoDTO> {
        return this.api.get<EnviarPresupuestoDTO>(`${this.path}/${id}/datos-envio`);
    }

    aprobar(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/aprobar`, {});
    }

    rechazar(id: number): Observable<void> {
        return this.api.post<void>(`${this.path}/${id}/rechazar`, {});
    }

    /** Convierte el presupuesto aprobado en pedido. Devuelve el pedido creado. */
    convertirAPedido(id: number): Observable<{ id: number; numero?: string; estado?: string }> {
        return this.api.post<{ id: number; numero?: string; estado?: string }>(`${this.path}/${id}/convertir-a-pedido`, {});
    }

    /** Descarga el presupuesto como PDF (devuelve Blob). */
    exportarPdf(id: number): Observable<Blob> {
        return this.api.getBlob(`${this.path}/${id}/pdf`);
    }

    private get publicoPath(): string {
        return `${this.path}/publico`;
    }

    /** Obtiene el presupuesto por enlace público (token + código). No requiere auth. */
    getByTokenPublico(token: string, codigo: string): Observable<Presupuesto> {
        return this.api.get<Presupuesto>(`${this.publicoPath}/${encodeURIComponent(token)}`, { codigo });
    }

    /** Aprobación desde enlace público. */
    aprobarPublico(token: string, codigo: string): Observable<void> {
        return this.api.post<void>(`${this.publicoPath}/${encodeURIComponent(token)}/aprobar`, { codigo });
    }

    /** Rechazo desde enlace público. */
    rechazarPublico(token: string, codigo: string): Observable<void> {
        return this.api.post<void>(`${this.publicoPath}/${encodeURIComponent(token)}/rechazar`, { codigo });
    }
}
