import { Component } from '@angular/core';
import { CatalogApiService } from '../data/catalog-api.service';

@Component({
  selector: 'catalog-billboard-page',
  standalone: true,
  template: '<h2>Cartelera</h2>'
})
export class BillboardPageComponent {
  constructor(private catalogApi: CatalogApiService) {}
}
