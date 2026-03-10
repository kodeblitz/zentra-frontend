import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StepperModule } from 'primeng/stepper';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SetupService } from '../../core/setup.service';
import { Empresa, Sucursal, Timbrado } from '../service/maestros.service';

@Component({
    selector: 'app-setup',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        StepperModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        ToastModule
    ],
    templateUrl: './setup.component.html',
    styleUrls: ['./setup.component.scss'],
    providers: [MessageService]
})
export class SetupComponent implements OnInit {
    activeStep = 1;
    saving = signal(false);

    empresa: Partial<Empresa> = {
        razonSocial: '',
        nombreFantasia: '',
        ruc: '',
        dv: '',
        direccion: '',
        telefono: '',
        correo: '',
        establecimientoDefault: '001',
        puntoEmisionDefault: '001'
    };

    sucursal: Partial<Sucursal> = {
        codigo: '001',
        nombre: 'Casa central',
        establecimiento: '001',
        puntoEmision: '001',
        direccion: '',
        activo: true
    };

    timbrado: Partial<Timbrado> = {
        numeroTimbrado: '',
        fechaInicioVigencia: '',
        fechaFinVigencia: '',
        activo: true
    };

    empresaCreada: Empresa | null = null;

    constructor(
        private setup: SetupService,
        private messageService: MessageService,
        private router: Router
    ) {}

    ngOnInit(): void {
        const hoy = new Date();
        const fin = new Date(hoy);
        fin.setFullYear(fin.getFullYear() + 1);
        this.timbrado.fechaInicioVigencia = hoy.toISOString().slice(0, 10);
        this.timbrado.fechaFinVigencia = fin.toISOString().slice(0, 10);
        this.setup.estaCompleto().subscribe((completo) => {
            if (completo) this.router.navigate(['/']);
        });
    }

    puedePaso1(): boolean {
        return !!(
            (this.empresa.razonSocial ?? '').trim() &&
            (this.empresa.ruc ?? '').trim()
        );
    }

    puedePaso2(): boolean {
        return !!(
            (this.sucursal.establecimiento ?? '').trim() &&
            (this.sucursal.puntoEmision ?? '').trim()
        );
    }

    puedePaso3(): boolean {
        return !!(
            (this.timbrado.numeroTimbrado ?? '').trim() &&
            (this.timbrado.fechaInicioVigencia ?? '').trim() &&
            (this.timbrado.fechaFinVigencia ?? '').trim()
        );
    }

    guardarEmpresa(): void {
        if (!this.puedePaso1()) return;
        this.saving.set(true);
        this.setup.crearEmpresa(this.empresa).subscribe({
            next: (e) => {
                this.empresaCreada = e;
                this.messageService.add({ severity: 'success', summary: 'Empresa creada', detail: 'Configurá la sucursal y timbrado.' });
                this.activeStep = 2;
                this.saving.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err?.error?.message ?? 'No se pudo crear la empresa.'
                });
                this.saving.set(false);
            }
        });
    }

    guardarSucursal(): void {
        if (!this.empresaCreada?.id || !this.puedePaso2()) return;
        this.saving.set(true);
        const s: Sucursal = {
            ...this.sucursal,
            empresa: { id: this.empresaCreada.id }
        };
        this.setup.crearSucursal(s).subscribe({
            next: (suc) => {
                this.setup.actualizarEmpresa(this.empresaCreada!.id!, {
                    sucursalDefault: { id: suc.id! },
                    establecimientoDefault: suc.establecimiento ?? '001',
                    puntoEmisionDefault: suc.puntoEmision ?? '001'
                }).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Sucursal creada', detail: 'Configurá el timbrado.' });
                        this.activeStep = 3;
                        this.saving.set(false);
                    },
                    error: () => {
                        this.messageService.add({ severity: 'warn', summary: 'Sucursal creada', detail: 'Podés configurar la sucursal por defecto en Paramétricos.' });
                        this.activeStep = 3;
                        this.saving.set(false);
                    }
                });
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err?.error?.message ?? 'No se pudo crear la sucursal.'
                });
                this.saving.set(false);
            }
        });
    }

    guardarTimbrado(): void {
        if (!this.empresaCreada?.id || !this.puedePaso3()) return;
        this.saving.set(true);
        const t: Timbrado = {
            ...this.timbrado,
            empresa: { id: this.empresaCreada.id }
        };
        this.setup.crearTimbrado(t).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Timbrado creado', detail: 'Configuración inicial completada.' });
                this.activeStep = 4;
                this.saving.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err?.error?.message ?? 'No se pudo crear el timbrado.'
                });
                this.saving.set(false);
            }
        });
    }

    finalizar(): void {
        this.setup.invalidarCache();
        this.router.navigate(['/']);
    }

    saltarSucursal(): void {
        if (!this.empresaCreada?.id) return;
        this.setup.actualizarEmpresa(this.empresaCreada.id, {
            establecimientoDefault: this.empresa.establecimientoDefault ?? '001',
            puntoEmisionDefault: this.empresa.puntoEmisionDefault ?? '001'
        }).subscribe({
            next: () => {
                this.messageService.add({ severity: 'info', summary: 'Omitido', detail: 'Podés agregar sucursales en Paramétricos.' });
                this.activeStep = 3;
            },
            error: () => this.activeStep = 3
        });
    }

    saltarTimbrado(): void {
        this.messageService.add({
            severity: 'warn',
            summary: 'Timbrado requerido',
            detail: 'Para facturación física en Paraguay necesitás un timbrado vigente.'
        });
    }
}
