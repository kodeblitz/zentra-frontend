import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/** Solo permite activar la ruta si hay sesión; si no, redirige a login. */
export const authGuard: CanActivateFn = (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);
    auth.restoreSession();
    if (auth.isLoggedIn()) {
        return true;
    }
    return router.createUrlTree(['/auth/login']);
};

/** Para canMatch: la ruta solo coincide si hay sesión (así la siguiente ruta '' redirige a login). */
export const authMatchGuard: CanMatchFn = (): boolean => {
    const auth = inject(AuthService);
    auth.restoreSession();
    return auth.isLoggedIn();
};
