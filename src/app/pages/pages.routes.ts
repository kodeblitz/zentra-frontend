import { Routes } from '@angular/router';
import { Documentation } from './documentation/documentation';
import { Crud } from './crud/crud';
import { Empty } from './empty/empty';
import { ClientesComponent } from './clientes/clientes';
import { ProspectosComponent } from './prospectos/prospectos';
import { DocumentosVentaComponent } from './documentos-venta/documentos-venta';
import { DocumentoVentaFormComponent } from './documentos-venta/documento-venta-form/documento-venta-form';
import { DocumentoVentaVerComponent } from './documentos-venta/documento-venta-ver/documento-venta-ver';
import { DevolucionesComponent } from './devoluciones/devoluciones';
import { CreditosComponent } from './creditos/creditos';
import { CreditoVerComponent } from './creditos/credito-ver/credito-ver';
import { CreditoNuevoComponent } from './creditos/credito-nuevo/credito-nuevo';
import { PagosComponent } from './pagos/pagos';
import { CarteraComponent } from './cartera/cartera';
import { PedidosComponent } from './pedidos/pedidos';
import { AlquileresComponent } from './alquileres/alquileres';
import { AlquilerVerComponent } from './alquileres/alquiler-ver/alquiler-ver';
import { PresupuestosComponent } from './presupuestos/presupuestos';
import { PresupuestoFormComponent } from './presupuestos/presupuesto-form/presupuesto-form';
import { PresupuestoVerComponent } from './presupuestos/presupuesto-ver/presupuesto-ver';
import { CajaComponent } from './caja/caja';
import { PdvComponent } from './pdv/pdv';
import { ParametricosComponent } from './parametricos/parametricos';
import { ImportacionComponent } from './importacion/importacion';
import { BackupComponent } from './backup/backup';
import { InventarioComponent } from './inventario/inventario';
import { ProductosComponent } from './productos/productos';
import { ProductoFormComponent } from './productos/producto-form/producto-form';
import { VisorPreciosComponent } from './productos/visor-precios/visor-precios';
import { featureGuard } from '../core/feature.guard';

export default [
    { path: 'documentation', component: Documentation },
    { path: 'crud', component: Crud },
    { path: 'empty', component: Empty },
    { path: 'clientes', component: ClientesComponent, data: { feature: 'clientes' }, canActivate: [featureGuard] },
    { path: 'prospectos', component: ProspectosComponent, data: { feature: 'prospectos' }, canActivate: [featureGuard] },
    { path: 'documentos-venta', component: DocumentosVentaComponent, data: { feature: 'documentos_venta' }, canActivate: [featureGuard] },
    { path: 'documentos-venta/nuevo', component: DocumentoVentaFormComponent, data: { feature: 'documentos_venta' }, canActivate: [featureGuard] },
    { path: 'documentos-venta/editar/:id', component: DocumentoVentaFormComponent, data: { feature: 'documentos_venta' }, canActivate: [featureGuard] },
    { path: 'documentos-venta/ver/:id', component: DocumentoVentaVerComponent, data: { feature: 'documentos_venta' }, canActivate: [featureGuard] },
    { path: 'devoluciones', component: DevolucionesComponent, data: { feature: 'devoluciones' }, canActivate: [featureGuard] },
    { path: 'creditos', component: CreditosComponent, data: { feature: 'creditos' }, canActivate: [featureGuard] },
    { path: 'creditos/nuevo', component: CreditoNuevoComponent, data: { feature: 'creditos' }, canActivate: [featureGuard] },
    { path: 'creditos/ver/:id', component: CreditoVerComponent, data: { feature: 'creditos' }, canActivate: [featureGuard] },
    { path: 'pagos', component: PagosComponent, data: { feature: 'pagos' }, canActivate: [featureGuard] },
    { path: 'cartera', component: CarteraComponent, data: { feature: 'cartera' }, canActivate: [featureGuard] },
    { path: 'pedidos', component: PedidosComponent, data: { feature: 'pedidos' }, canActivate: [featureGuard] },
    { path: 'alquileres', component: AlquileresComponent, data: { feature: 'alquileres' }, canActivate: [featureGuard] },
    { path: 'alquileres/ver/:id', component: AlquilerVerComponent, data: { feature: 'alquileres' }, canActivate: [featureGuard] },
    { path: 'presupuestos', component: PresupuestosComponent, data: { feature: 'presupuestos' }, canActivate: [featureGuard] },
    { path: 'presupuestos/nuevo', component: PresupuestoFormComponent, data: { feature: 'presupuestos' }, canActivate: [featureGuard] },
    { path: 'presupuestos/editar/:id', component: PresupuestoFormComponent, data: { feature: 'presupuestos' }, canActivate: [featureGuard] },
    { path: 'presupuestos/ver/:id', component: PresupuestoVerComponent, data: { feature: 'presupuestos' }, canActivate: [featureGuard] },
    { path: 'caja', component: CajaComponent, data: { feature: 'caja' }, canActivate: [featureGuard] },
    { path: 'pdv', component: PdvComponent, data: { feature: 'pdv' }, canActivate: [featureGuard] },
    { path: 'inventario', component: InventarioComponent, data: { feature: 'inventario' }, canActivate: [featureGuard] },
    { path: 'productos', component: ProductosComponent, data: { feature: 'productos' }, canActivate: [featureGuard] },
    { path: 'productos/nuevo', component: ProductoFormComponent, data: { feature: 'productos' }, canActivate: [featureGuard] },
    { path: 'productos/editar/:id', component: ProductoFormComponent, data: { feature: 'productos' }, canActivate: [featureGuard] },
    { path: 'productos/visor-precios', component: VisorPreciosComponent, data: { feature: 'productos' }, canActivate: [featureGuard] },
    { path: 'parametricos', component: ParametricosComponent, data: { feature: 'parametricos' }, canActivate: [featureGuard] },
    { path: 'importacion', component: ImportacionComponent, data: { feature: 'parametricos' }, canActivate: [featureGuard] },
    { path: 'backup', component: BackupComponent },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
