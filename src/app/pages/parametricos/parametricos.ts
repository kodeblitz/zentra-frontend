import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { MaestrosService, Categoria, TipoDocumento, Moneda, CondicionPago, UnidadMedida, MedioPago, Empresa } from '../service/maestros.service';

@Component({
    selector: 'app-parametricos',
    standalone: true,
    imports: [CommonModule, TabsModule, TableModule],
    templateUrl: './parametricos.component.html',
    styleUrls: ['./parametricos.component.scss']
})
export class ParametricosComponent implements OnInit {
    activeTab = 0;
    categorias: Categoria[] = [];
    tiposDocumento: TipoDocumento[] = [];
    monedas: Moneda[] = [];
    condicionesPago: CondicionPago[] = [];
    unidadesMedida: UnidadMedida[] = [];
    mediosPago: MedioPago[] = [];
    empresas: Empresa[] = [];

    constructor(private maestros: MaestrosService) {}

    ngOnInit(): void {
        this.maestros.categorias().subscribe((c) => (this.categorias = c ?? []));
        this.maestros.tiposDocumento().subscribe((t) => (this.tiposDocumento = t ?? []));
        this.maestros.monedas().subscribe((m) => (this.monedas = m ?? []));
        this.maestros.condicionesPago().subscribe((c) => (this.condicionesPago = c ?? []));
        this.maestros.unidadesMedida().subscribe((u) => (this.unidadesMedida = u ?? []));
        this.maestros.mediosPagoTodos().subscribe((m) => (this.mediosPago = m ?? []));
        this.maestros.empresas().subscribe((e) => (this.empresas = e ?? []));
    }
}
