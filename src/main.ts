import { bootstrapApplication } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideServiceWorker('ngsw-worker.js', {
    enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:3000'
  })]
}).catch(console.error);
