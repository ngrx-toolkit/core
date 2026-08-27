import { LayoutModule } from '@angular/cdk/layout';
import {
  provideHttpClient,
  withInterceptors,
  withXhr,
} from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { appRoutes } from './app.routes';
import { memoryHttpInterceptor } from './todo-entity-resource/memory-http.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes, withComponentInputBinding()),
    provideAnimations(),
    provideHttpClient(withXhr(), withInterceptors([memoryHttpInterceptor])),
    importProvidersFrom(LayoutModule),
  ],
};
