import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { CompraService, Compra, CompraDetalle } from '../../service/compra.service';

@Component({
    selector: 'app-compra-ver',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule, TableModule, CardModule],
    templateUrl: './compra-ver.component.html',
    styleUrls: ['./compra-ver.component.scss']
})
export class CompraVerComponent implements OnInit {
    compra = signal<Compra | null>(null);
    loading = signal(true);
    id: number | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private compraService: CompraService
    ) {}

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
            this.id = +idParam;
            this.load();
        } else {
            this.router.navigate(['/pages/compras']);
        }
    }

    load(): void {
        if (!this.id) return;
        this.compraService.getById(this.id).subscribe({
            next: (c) => {
                this.compra.set(c);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.router.navigate(['/pages/compras']);
            }
        });
    }

    getDescripcionLinea(line: CompraDetalle): string {
        if (line.descripcion?.trim()) return line.descripcion;
        const prod = line.producto as unknown as { nombre?: string };
        return prod?.nombre ?? '-';
    }

    getProveedorNombre(): string {
        const p = this.compra()?.proveedor as { razonSocial?: string; id?: number } | undefined;
        if (!p) return '-';
        return p.razonSocial ?? ('#' + (p.id ?? ''));
    }

    getSimboloMoneda(): string {
        const m = this.compra()?.moneda as { simbolo?: string; codigo?: string } | undefined;
        return m?.simbolo ?? m?.codigo ?? 'Gs.';
    }

    volver(): void {
        this.router.navigate(['/pages/compras']);
    }
}
