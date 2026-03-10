import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { UsuarioService, UsuarioDTO, RoleInfo } from '../service/usuario.service';

@Component({
    selector: 'app-usuarios',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        DialogModule,
        ToastModule,
        ToolbarModule,
        IconFieldModule,
        InputIconModule,
        TagModule,
        CheckboxModule,
        TooltipModule
    ],
    templateUrl: './usuarios.component.html',
    styleUrls: ['./usuarios.component.scss'],
    providers: [MessageService]
})
export class UsuariosComponent implements OnInit {
    usuarios = signal<UsuarioDTO[]>([]);
    rolesDisponibles: RoleInfo[] = [];
    loading = signal(false);
    dialog = false;
    editing = false;
    submitted = false;
    saving = signal(false);

    usuario: Partial<UsuarioDTO> & { password?: string } = {};
    rolesSeleccionados: string[] = [];

    constructor(
        private usuarioService: UsuarioService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.load();
        this.usuarioService.rolesDisponibles().subscribe((r) => (this.rolesDisponibles = r ?? []));
    }

    load(): void {
        this.loading.set(true);
        this.usuarioService.listar().subscribe({
            next: (list) => {
                this.usuarios.set(list ?? []);
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar usuarios.' });
                this.loading.set(false);
            }
        });
    }

    openNew(): void {
        this.usuario = { username: '', nombre: '', email: '', activo: true, password: '', roles: ['user'] };
        this.rolesSeleccionados = ['user'];
        this.editing = false;
        this.submitted = false;
        this.dialog = true;
    }

    edit(row: UsuarioDTO): void {
        this.usuario = { ...row };
        this.rolesSeleccionados = [...(row.roles ?? ['user'])];
        this.editing = true;
        this.submitted = false;
        this.dialog = true;
    }

    onDialogHide(): void {
        this.dialog = false;
        this.usuario = {};
        this.rolesSeleccionados = [];
    }

    onRolToggle(codigo: string, checked: boolean): void {
        if (checked) {
            if (!this.rolesSeleccionados.includes(codigo)) this.rolesSeleccionados = [...this.rolesSeleccionados, codigo];
        } else {
            this.rolesSeleccionados = this.rolesSeleccionados.filter((r) => r !== codigo);
        }
    }

    getRolesLabel(roles: string[] | undefined): string {
        if (!roles || roles.length === 0) return '-';
        return roles.map((r) => this.rolesDisponibles.find((x) => x.codigo === r)?.nombre ?? r).join(', ');
    }

    guardar(): void {
        this.submitted = true;
        const u = this.usuario;
        if (!u.username?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Usuario requerido', detail: 'El nombre de usuario es obligatorio.' });
            return;
        }
        if (!this.editing && !u.password?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Contraseña requerida', detail: 'La contraseña es obligatoria para nuevos usuarios.' });
            return;
        }
        if (this.editing && u.password?.trim() && u.password.length < 8) {
            this.messageService.add({ severity: 'warn', summary: 'Contraseña', detail: 'La contraseña debe tener al menos 8 caracteres.' });
            return;
        }

        this.saving.set(true);
        const roles = this.rolesSeleccionados.length > 0 ? this.rolesSeleccionados : ['user'];

        if (this.editing && u.id) {
            const body: Record<string, unknown> = { nombre: u.nombre, email: u.email, activo: u.activo ?? true, roles };
            if (u.password?.trim()) body['password'] = u.password;
            this.usuarioService.actualizar(u.id, body).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Usuario actualizado.' });
                    this.load();
                    this.dialog = false;
                    this.saving.set(false);
                },
                error: (e) => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.error?.message ?? 'No se pudo actualizar.' });
                    this.saving.set(false);
                }
            });
        } else {
            this.usuarioService.crear({
                username: u.username!.trim(),
                password: u.password!,
                nombre: u.nombre?.trim(),
                email: u.email?.trim(),
                roles
            }).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Usuario creado.' });
                    this.load();
                    this.dialog = false;
                    this.saving.set(false);
                },
                error: (e) => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.error?.message ?? 'No se pudo crear.' });
                    this.saving.set(false);
                }
            });
        }
    }
}
