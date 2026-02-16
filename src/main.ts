import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEsPy from '@angular/common/locales/es-PY';
import { appConfig } from './app.config';
import { AppComponent } from './app.component';

registerLocaleData(localeEsPy, 'es-PY');

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
