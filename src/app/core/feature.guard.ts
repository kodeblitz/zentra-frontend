import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * Guard que impide acceder a una ruta si el módulo asociado (data['feature']) está deshabilitado por feature flags.
 * Uso en rutas: data: { feature: 'clientes' }, canActivate: [featureGuard]
 * Si no hay 'feature' en data, la ruta se permite.
 */
export const featureGuard: CanActivateFn = (route) => {
    const featureKey = route.data['feature'] as string | undefined;
    if (!featureKey) return true;

    const featureFlags = inject(FeatureFlagsService);
    const router = inject(Router);

    if (featureFlags.isEnabled(featureKey)) return true;
    return router.createUrlTree(['/notfound']);
};
