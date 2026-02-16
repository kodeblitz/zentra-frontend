import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CarteraService, SaldoClienteDTO, DocumentoSaldoDTO, CarteraAgingDTO } from '../service/cartera.service';

@Component({
    selector: 'app-cartera',
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule, CardModule, TabsModule, TagModule, ToastModule],
    templateUrl: './cartera.component.html',
    styleUrls: ['./cartera.component.scss'],
    providers: [MessageService]
})
export class CarteraComponent implements OnInit {
    saldosCliente = signal<SaldoClienteDTO[]>([]);
    documentosConSaldo = signal<DocumentoSaldoDTO[]>([]);
    aging = signal<CarteraAgingDTO | null>(null);
    loading = signal(false);

    constructor(
        private carteraService: CarteraService,
        private messageService: MessageService
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
        this.loadAging();
    }

    loadAging(): void {
        this.carteraService.aging().subscribe({
            next: (data) => this.aging.set(data),
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar aging.' })
        });
    }
}
