import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { DocumentoVentaService, DocumentoVenta, DocumentoVentaDetalle } from '../../service/documento-venta.service';
import { ClienteService } from '../../service/cliente.service';
import { numeroALetras } from '../../../core/numero-a-letras.util';

@Component({
    selector: 'app-documento-venta-ver',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        TagModule,
        TableModule,
        ToastModule,
        CardModule
    ],
    templateUrl: './documento-venta-ver.component.html',
    styleUrls: ['./documento-venta-ver.component.scss'],
    providers: [MessageService]
})
export class DocumentoVentaVerComponent implements OnInit {
    documento = signal<DocumentoVenta | null>(null);
    clienteNombre = signal<string>('');
    loading = signal(true);
    id: number | null = null;
    /** Vista compacta para impresión de ticket (comida rápida/supers). */
    vistaTicket = signal(false);

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private docService: DocumentoVentaService,
        private clienteService: ClienteService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.vistaTicket.set(this.route.snapshot.queryParamMap.get('vista') === 'ticket');
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
            this.id = +idParam;
            this.load();
        } else {
            this.router.navigate(['/pages/documentos-venta']);
        }
    }

    load(): void {
        if (!this.id) return;
        this.loading.set(true);
        this.docService.getById(this.id).subscribe({
            next: (doc) => {
                this.documento.set(doc);
                const cl = doc.cliente as { id?: number; razonSocial?: string } | undefined;
                if (cl?.razonSocial) {
                    this.clienteNombre.set(cl.razonSocial);
                } else if (cl?.id) {
                    this.clienteService.getById(cl.id).subscribe({
                        next: (c) => this.clienteNombre.set(c.razonSocial ?? ''),
                        error: () => this.clienteNombre.set(String(cl.id))
                    });
                } else {
                    this.clienteNombre.set('-');
                }
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el documento.' });
                this.loading.set(false);
            }
        });
    }

    getNumeroCompleto(doc: DocumentoVenta | null): string {
        if (!doc) return '-';
        const e = doc.establecimiento ?? '';
        const p = doc.puntoEmision ?? '';
        const n = doc.numero ?? '';
        return [e, p, n].filter(Boolean).join('-') || String(doc.id ?? '-');
    }

    /** Formato factura física: 001-001 N° 0000145 */
    getNumeroFacturaFormato(doc: DocumentoVenta | null): string {
        if (!doc) return '—';
        const e = doc.establecimiento ?? '001';
        const p = doc.puntoEmision ?? '001';
        const n = doc.numero ?? String(doc.id ?? '');
        return `${e}-${p} N° ${n}`;
    }

    totalEnLetras(total: number | null | undefined): string {
        return numeroALetras(total ?? 0);
    }

    /** Liquidación IVA por alícuota (precios en PY ya incluyen IVA; esto desglosa cuánto es 5% y 10%). */
    liquidacionIva(doc: DocumentoVenta | null): { iva5: number; iva10: number } {
        const det = doc?.detalle ?? [];
        let iva5 = 0;
        let iva10 = 0;
        for (const line of det) {
            const pct = line.ivaPorcentaje ?? 0;
            const monto = line.ivaMonto ?? 0;
            if (Math.round(pct) === 5) iva5 += monto;
            else if (Math.round(pct) === 10) iva10 += monto;
        }
        return { iva5, iva10 };
    }

    /** Nombre empresa para cabecera (razón social o nombre fantasía). */
    empresaNombre(doc: DocumentoVenta | null): string {
        const e = doc?.empresa as { razonSocial?: string; nombreFantasia?: string } | undefined;
        return e?.razonSocial ?? e?.nombreFantasia ?? '—';
    }

    /** RUC empresa con DV (ej. 80151891-1). */
    empresaRuc(doc: DocumentoVenta | null): string {
        const e = doc?.empresa as { ruc?: string; dv?: string } | undefined;
        if (!e?.ruc) return '—';
        return e.dv != null && e.dv !== '' ? `${e.ruc}-${e.dv}` : String(e.ruc);
    }

    getEmpresaDireccion(doc: DocumentoVenta | null): string {
        const e = doc?.empresa as { direccion?: string } | undefined;
        return e?.direccion ?? '—';
    }

    getEmpresaTelefono(doc: DocumentoVenta | null): string {
        const e = doc?.empresa as { telefono?: string } | undefined;
        return e?.telefono ?? '—';
    }

    getClienteRuc(doc: DocumentoVenta | null): string {
        const c = doc?.cliente as { ruc?: string } | undefined;
        return c?.ruc ?? '—';
    }

    getClienteDireccion(doc: DocumentoVenta | null): string {
        const c = doc?.cliente as { direccion?: string } | undefined;
        return c?.direccion ?? '—';
    }

    getClienteTelefono(doc: DocumentoVenta | null): string {
        const c = doc?.cliente as { telefono?: string } | undefined;
        return c?.telefono ?? '—';
    }

    /** Condición de venta: CONTADO o CRÉDITO según documento. */
    condicionVentaLabel(doc: DocumentoVenta | null): { contado: boolean; credito: boolean } {
        const cp = doc?.condicionPago as { nombre?: string; codigo?: string } | undefined;
        const nombre = (cp?.nombre ?? cp?.codigo ?? '').toUpperCase();
        const esCredito = nombre.includes('CRÉDITO') || nombre.includes('CREDITO');
        return { contado: !esCredito, credito: esCredito };
    }

    /** Fecha emisión para factura: "03 DE enero DE 2026". */
    fechaEmisionFactura(doc: DocumentoVenta | null): string {
        const d = doc?.fechaEmision;
        if (!d) return '—';
        const date = new Date(d + 'T12:00:00');
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const dia = date.getDate().toString().padStart(2, '0');
        const mes = meses[date.getMonth()];
        const anio = date.getFullYear();
        return `${dia} DE ${mes} DE ${anio}`;
    }

    getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (estado === 'EMITIDO') return 'success';
        if (estado === 'ANULADO') return 'danger';
        return 'secondary';
    }

    getDescripcionLinea(line: DocumentoVentaDetalle): string {
        if (line.descripcion && String(line.descripcion).trim()) return line.descripcion;
        const prod = line.producto as unknown as { nombre?: string };
        return prod?.nombre ?? '-';
    }

    editar(): void {
        const doc = this.documento();
        if (doc?.estado !== 'BORRADOR') return;
        if (doc?.id) this.router.navigate(['/pages/documentos-venta/editar', doc.id]);
    }

    volver(): void {
        this.router.navigate(['/pages/documentos-venta']);
    }

    imprimir(): void {
        window.print();
    }

    cerrarVentana(): void {
        window.close();
    }

    /** Fecha/hora corta para ticket (ej. 21/02/26). */
    fechaHoraTicket(doc: DocumentoVenta | null): string {
        if (!doc?.fechaEmision) return '';
        const s = String(doc.fechaEmision).trim().split('T')[0];
        const [y, m, day] = s.split('-');
        if (!day || !m || !y) return s;
        return `${day}/${m}/${y.slice(-2)}`;
    }
}
