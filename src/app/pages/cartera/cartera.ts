import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { CarteraService, SaldoClienteDTO, DocumentoSaldoDTO, CarteraAgingDTO } from '../service/cartera.service';

@Component({
    selector: 'app-cartera',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        ButtonModule,
        CardModule,
        TabsModule,
        TagModule,
        ToastModule,
        TooltipModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule
    ],
    templateUrl: './cartera.component.html',
    styleUrls: ['./cartera.component.scss'],
    providers: [MessageService]
})
export class CarteraComponent implements OnInit {
    saldosCliente = signal<SaldoClienteDTO[]>([]);
    documentosConSaldo = signal<DocumentoSaldoDTO[]>([]);
    aging = signal<CarteraAgingDTO | null>(null);
    loading = signal(false);
    activeTab = '0';
    filtroVencimiento: 'todos' | 'aldia' | 'vencido' = 'todos';

    constructor(
        private carteraService: CarteraService,
        private messageService: MessageService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.carteraService.saldosCliente().subscribe({
            next: (list) => {
                this.saldosCliente.set(list ?? []);
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar saldos.' });
                this.loading.set(false);
            }
        });
        this.carteraService.documentosConSaldo().subscribe({
            next: (list) => this.documentosConSaldo.set(list ?? []),
            error: () => {}
        });
        this.carteraService.aging().subscribe({
            next: (data) => this.aging.set(data),
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar aging.' })
        });
    }

    // ─── KPI / Aging helpers ───

    getPctAging(monto: number): number {
        const total = this.aging()?.total ?? 0;
        if (total <= 0) return 0;
        return Math.round((monto / total) * 100);
    }

    getTotalSaldos(): number {
        return this.saldosCliente().reduce((sum, c) => sum + (c.saldoTotal ?? 0), 0);
    }

    getTotalSaldoDocumentos(): number {
        return this.documentosConSaldo().reduce((sum, d) => sum + (d.saldoPendiente ?? 0), 0);
    }

    // ─── Riesgo / severidad ───

    getRiesgoClass(saldoTotal: number): string {
        if (saldoTotal >= 5_000_000) return 'riesgo-alto';
        if (saldoTotal >= 1_000_000) return 'riesgo-medio';
        return 'riesgo-bajo';
    }

    getSaldoTotalClass(saldoTotal: number): string {
        if (saldoTotal >= 5_000_000) return 'text-red-500';
        if (saldoTotal >= 1_000_000) return 'text-orange-500';
        return 'text-color';
    }

    getDiasVencidoLabel(dias: number | undefined): string {
        const d = dias ?? 0;
        if (d <= 0) return 'Al día';
        if (d <= 30) return `${d}d vencido`;
        if (d <= 60) return `${d}d vencido`;
        return `${d}d vencido`;
    }

    getDiasVencidoSeverity(dias: number | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const d = dias ?? 0;
        if (d <= 0) return 'success';
        if (d <= 30) return 'warn';
        if (d <= 60) return 'danger';
        return 'danger';
    }

    getDiasVencidoTextClass(dias: number | undefined): string {
        const d = dias ?? 0;
        if (d <= 0) return 'text-green-500';
        if (d <= 30) return 'text-yellow-600';
        if (d <= 60) return 'text-orange-500';
        return 'text-red-500';
    }

    getAgingRangoLabel(dias: number | undefined): string {
        const d = dias ?? 0;
        if (d <= 30) return '0-30';
        if (d <= 60) return '31-60';
        if (d <= 90) return '61-90';
        return '+90';
    }

    getAgingRangoSeverity(dias: number | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const d = dias ?? 0;
        if (d <= 30) return 'success';
        if (d <= 60) return 'warn';
        if (d <= 90) return 'danger';
        return 'danger';
    }

    // ─── Filtro de vencimiento ───

    filtrarVencimiento(tipo: 'aldia' | 'vencido', dt: Table): void {
        this.filtroVencimiento = tipo;
        if (tipo === 'aldia') {
            dt.filter(0, 'diasVencido', 'lte');
        } else {
            dt.filter(1, 'diasVencido', 'gte');
        }
    }

    // ─── Navegación ───

    irAPagos(): void {
        this.router.navigate(['/pages/pagos']);
    }

    irAPagosCliente(clienteId: number): void {
        this.router.navigate(['/pages/pagos'], { queryParams: { clienteId } });
    }
}
