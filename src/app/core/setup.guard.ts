import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { SetupService } from './setup.service';

/**
 * Guard que redirige al setup inicial si no hay ninguna empresa configurada.
 * Se usa en las rutas principales (dashboard, pages) para forzar la configuración
 * en la primera ejecución.
 */
export const setupGuard: CanActivateFn = (): import('rxjs').Observable<boolean | UrlTree> => {
    const setup = inject(SetupService);
    const router = inject(Router);

    return setup.estaCompleto().pipe(
        map((completo) => {
            if (completo) return true;
            return router.createUrlTree(['/setup']);
        }),
        catchError(() => of(router.createUrlTree(['/setup'])))
    );
};
