import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
    FidelizacionService,
    ProgramaFidelizacion,
    FidelizacionNivel,
    FidelizacionDashboard,
    MovimientoFidelizacion
} from '../service/fidelizacion.service';

@Component({
    selector: 'app-fidelizacion',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ButtonModule, TableModule, TabsModule,
        TagModule, ToastModule, ToggleSwitchModule, InputNumberModule,
        InputTextModule, TooltipModule
    ],
    templateUrl: './fidelizacion.component.html',
    styleUrl: './fidelizacion.component.scss',
    providers: [MessageService]
})
export class FidelizacionComponent implements OnInit {
    loading = signal(false);
    activeTab = '0';

    dashboard: FidelizacionDashboard = {};
    programas: ProgramaFidelizacion[] = [];
    movimientos: MovimientoFidelizacion[] = [];

    nivelesEditando: FidelizacionNivel[] = [];
    programaNivelesId: number | null = null;
    guardandoNiveles = false;

    constructor(
        private fidelizacionService: FidelizacionService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.cargarDashboard();
        this.cargarProgramas();
        this.cargarMovimientos();
    }

    cargarDashboard(): void {
        this.fidelizacionService.dashboard().subscribe({
            next: (d) => (this.dashboard = d),
            error: () => {}
        });
    }

    cargarProgramas(): void {
        this.fidelizacionService.listarProgramas().subscribe({
            next: (p) => (this.programas = p ?? []),
            error: () => {}
        });
    }

    cargarMovimientos(): void {
        this.fidelizacionService.movimientos(undefined, 200).subscribe({
            next: (m) => (this.movimientos = m ?? []),
            error: () => {}
        });
    }

    getPrograma(tipo: string): ProgramaFidelizacion | undefined {
        return this.programas.find((p) => p.tipo === tipo);
    }

    togglePrograma(prog: ProgramaFidelizacion): void {
        this.fidelizacionService.actualizarPrograma(prog).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Guardado', detail: `${prog.nombre} ${prog.activo ? 'activado' : 'desactivado'}` });
                this.cargarDashboard();
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar.' })
        });
    }

    guardarPrograma(prog: ProgramaFidelizacion): void {
        this.fidelizacionService.actualizarPrograma(prog).subscribe({
            next: () => this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Configuración actualizada.' }),
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' })
        });
    }

    editarNiveles(prog: ProgramaFidelizacion): void {
        this.programaNivelesId = prog.id!;
        this.nivelesEditando = (prog.niveles ?? []).map((n) => ({ ...n }));
    }

    agregarNivel(): void {
        const maxOrden = this.nivelesEditando.reduce((max, n) => Math.max(max, n.orden ?? 0), 0);
        this.nivelesEditando.push({ nombre: '', orden: maxOrden + 1, montoMinimo: 0, beneficioPorcentaje: 0 });
    }

    eliminarNivel(index: number): void {
        this.nivelesEditando.splice(index, 1);
    }

    guardarNiveles(): void {
        if (!this.programaNivelesId) return;
        this.guardandoNiveles = true;
        this.fidelizacionService.actualizarNiveles(this.programaNivelesId, this.nivelesEditando).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Niveles actualizados.' });
                this.guardandoNiveles = false;
                this.programaNivelesId = null;
                this.cargarProgramas();
                this.cargarDashboard();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar niveles.' });
                this.guardandoNiveles = false;
            }
        });
    }

    cancelarNiveles(): void {
        this.programaNivelesId = null;
        this.nivelesEditando = [];
    }

    getDistribucionEntries(): { nombre: string; count: number }[] {
        const dist = this.dashboard.distribucionNiveles;
        if (!dist) return [];
        return Object.entries(dist).map(([nombre, count]) => ({ nombre, count }));
    }

    getTipoMovLabel(tipo: string): string {
        const labels: Record<string, string> = {
            ACUMULACION: 'Puntos acumulados',
            CANJE: 'Canje de puntos',
            CASHBACK_ACUMULADO: 'Cashback acumulado',
            CASHBACK_APLICADO: 'Cashback aplicado',
            NIVEL_SUBIDO: 'Cambio de nivel',
            AJUSTE: 'Ajuste manual'
        };
        return labels[tipo] ?? tipo;
    }

    getTipoMovSeverity(tipo: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (tipo) {
            case 'ACUMULACION':
            case 'CASHBACK_ACUMULADO':
                return 'success';
            case 'CANJE':
            case 'CASHBACK_APLICADO':
                return 'warn';
            case 'NIVEL_SUBIDO':
                return 'info';
            default:
                return 'secondary';
        }
    }
}
