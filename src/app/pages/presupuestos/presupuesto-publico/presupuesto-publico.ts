import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PresupuestoService, Presupuesto, PresupuestoDetalle } from '../../service/presupuesto.service';

@Component({
    selector: 'app-presupuesto-publico',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        CardModule,
        TableModule,
        ToastModule
    ],
    template: `
        <p-toast />
        <div class="min-h-screen bg-surface-ground flex flex-col items-center justify-start p-4 md:p-8">
            <div class="w-full max-w-2xl">
                <h1 class="text-2xl font-bold text-color mb-6 text-center">Presupuesto</h1>

                @if (!presupuesto()) {
                    <p-card header="Acceso con código" styleClass="mb-4">
                        <p class="text-color mb-4">Ingresá el código de seguridad que te enviaron para ver el presupuesto.</p>
                        <div class="flex flex-col sm:flex-row gap-3">
                            <input
                                pInputText
                                [(ngModel)]="codigoIngresado"
                                placeholder="Código de 6 dígitos"
                                class="flex-1 font-mono text-center text-xl"
                                maxlength="10"
                                (keydown.enter)="verPresupuesto()"
                            />
                            <p-button label="Ver presupuesto" icon="pi pi-eye" (onClick)="verPresupuesto()" [loading]="loading()" />
                        </div>
                        @if (errorMensaje()) {
                            <p class="text-red-500 text-sm mt-2">{{ errorMensaje() }}</p>
                        }
                    </p-card>
                } @else {
                    <p-card [header]="'Presupuesto ' + (presupuesto()?.numero ?? presupuesto()?.id)" styleClass="mb-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-color mb-4">
                            <div>
                                <span class="block text-sm text-muted-color mb-1">Cliente</span>
                                <span class="font-semibold">{{ clienteNombre() }}</span>
                            </div>
                            <div>
                                <span class="block text-sm text-muted-color mb-1">Fecha emisión / Validez</span>
                                <span>{{ presupuesto()?.fechaEmision | date:'d/M/yyyy' }} — {{ presupuesto()?.fechaValidez | date:'d/M/yyyy' }}</span>
                            </div>
                            <div>
                                <span class="block text-sm text-muted-color mb-1">Tipo</span>
                                <span>{{ presupuesto()?.tipoPedido === 'RETIRO' ? 'Retiro' : 'Delivery' }}</span>
                            </div>
                            @if (presupuesto()?.direccionEntrega) {
                                <div class="md:col-span-2">
                                    <span class="block text-sm text-muted-color mb-1">Dirección</span>
                                    <span>{{ presupuesto()?.direccionEntrega }}</span>
                                </div>
                            }
                        </div>
                        <p-table [value]="presupuesto()?.detalle ?? []" [tableStyle]="{ 'min-width': '100%' }">
                            <ng-template #header>
                                <tr>
                                    <th>Descripción</th>
                                    <th class="text-right">Cant.</th>
                                    <th class="text-right">P. unit.</th>
                                    <th class="text-right">Total</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-line>
                                <tr>
                                    <td>{{ getDescripcionLinea(line) }}</td>
                                    <td class="text-right">{{ line.cantidad | number:'1.2-2' }}</td>
                                    <td class="text-right">{{ line.precioUnitario | number:'1.0-0' }} Gs.</td>
                                    <td class="text-right">{{ line.totalLinea | number:'1.0-0' }} Gs.</td>
                                </tr>
                            </ng-template>
                            <ng-template #emptymessage>
                                <tr><td colspan="4">Sin líneas.</td></tr>
                            </ng-template>
                        </p-table>
                        <div class="flex justify-end gap-2 mt-4 font-bold text-lg text-color">
                            <span>Total:</span><span class="text-primary">{{ presupuesto()?.total | number:'1.0-0' }} Gs.</span>
                        </div>
                        @if (presupuesto()?.observaciones) {
                            <p class="mt-4 text-sm text-muted-color"><strong>Observaciones:</strong> {{ presupuesto()?.observaciones }}</p>
                        }
                    </p-card>

                    @if (presupuesto()?.estado === 'ENVIADO') {
                        <div class="flex flex-col sm:flex-row gap-3 justify-center">
                            <p-button label="Aprobar presupuesto" icon="pi pi-check" severity="success" (onClick)="aprobar()" [loading]="enviando()" />
                            <p-button label="Rechazar presupuesto" icon="pi pi-times" severity="danger" [outlined]="true" (onClick)="rechazar()" [loading]="enviando()" />
                        </div>
                    } @else if (estadoFinal()) {
                        <p-card [styleClass]="presupuesto()?.estado === 'APROBADO' ? 'border-green-500' : 'border-red-500'">
                            <p class="m-0 text-center font-semibold text-color">
                                @if (presupuesto()?.estado === 'APROBADO') {
                                    <i class="pi pi-check-circle text-green-500 mr-2"></i>Presupuesto aprobado.
                                } @else if (presupuesto()?.estado === 'RECHAZADO') {
                                    <i class="pi pi-times-circle text-red-500 mr-2"></i>Presupuesto rechazado.
                                } @else {
                                    Estado: {{ presupuesto()?.estado }}
                                }
                            </p>
                        </p-card>
                    }

                    <p-button label="Volver a ingresar código" icon="pi pi-arrow-left" [text]="true" severity="secondary" class="mt-4" (onClick)="volverACodigo()" />
                }
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }
    `],
    providers: [MessageService]
})
export class PresupuestoPublicoComponent implements OnInit {
    token = signal<string>('');
    codigoIngresado = '';
    presupuesto = signal<Presupuesto | null>(null);
    loading = signal(false);
    enviando = signal(false);
    errorMensaje = signal<string>('');

    estadoFinal = computed(() => {
        const e = this.presupuesto()?.estado;
        return e === 'APROBADO' || e === 'RECHAZADO' || e === 'CONVERTIDO';
    });

    constructor(
        private route: ActivatedRoute,
        private presupuestoService: PresupuestoService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        const t = this.route.snapshot.paramMap.get('token');
        if (t) this.token.set(t);
    }

    clienteNombre(): string {
        const p = this.presupuesto();
        if (!p) return '—';
        const dto = p as { clienteNombre?: string; cliente?: { razonSocial?: string; id?: number } };
        return dto.clienteNombre ?? dto.cliente?.razonSocial ?? `Cliente #${dto.cliente?.id ?? ''}`;
    }

    getDescripcionLinea(line: PresupuestoDetalle): string {
        if (line.descripcion?.trim()) return line.descripcion;
        const prod = line.producto as unknown as { nombre?: string };
        return prod?.nombre ?? '—';
    }

    verPresupuesto(): void {
        const t = this.token();
        const codigo = (this.codigoIngresado ?? '').trim();
        if (!t) {
            this.errorMensaje.set('Enlace inválido.');
            return;
        }
        if (!codigo) {
            this.errorMensaje.set('Ingresá el código de seguridad.');
            return;
        }
        this.errorMensaje.set('');
        this.loading.set(true);
        this.presupuestoService.getByTokenPublico(t, codigo).subscribe({
            next: (p) => {
                this.presupuesto.set(p);
                this.loading.set(false);
            },
            error: (err) => {
                this.errorMensaje.set(err?.error?.message ?? 'Código incorrecto o enlace no válido.');
                this.loading.set(false);
            }
        });
    }

    aprobar(): void {
        const t = this.token();
        const codigo = (this.codigoIngresado ?? '').trim();
        if (!t || !codigo) return;
        this.enviando.set(true);
        this.presupuestoService.aprobarPublico(t, codigo).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Aprobado', detail: 'El presupuesto fue aprobado.' });
                this.presupuesto.update((p) => (p ? { ...p, estado: 'APROBADO' } : null));
                this.enviando.set(false);
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'No se pudo aprobar.' });
                this.enviando.set(false);
            }
        });
    }

    rechazar(): void {
        const t = this.token();
        const codigo = (this.codigoIngresado ?? '').trim();
        if (!t || !codigo) return;
        this.enviando.set(true);
        this.presupuestoService.rechazarPublico(t, codigo).subscribe({
            next: () => {
                this.messageService.add({ severity: 'info', summary: 'Rechazado', detail: 'El presupuesto fue rechazado.' });
                this.presupuesto.update((p) => (p ? { ...p, estado: 'RECHAZADO' } : null));
                this.enviando.set(false);
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'No se pudo rechazar.' });
                this.enviando.set(false);
            }
        });
    }

    volverACodigo(): void {
        this.presupuesto.set(null);
        this.codigoIngresado = '';
        this.errorMensaje.set('');
    }
}
