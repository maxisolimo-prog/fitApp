import { bootstrapApplication } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';
import { AppComponent } from './app/app.component';
import { startBrand } from './app/brands';
import { BRAND } from './app/brands/brand.token';

// La marca se resuelve y se aplica antes de dibujar nada: ver src/app/brands/.
const brand = startBrand(window);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: BRAND, useValue: brand },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:3000'
    })
  ]
}).catch(console.error);
