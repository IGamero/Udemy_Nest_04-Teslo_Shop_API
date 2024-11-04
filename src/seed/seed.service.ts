import { Injectable } from '@nestjs/common';
import { ProductsService } from './../products/products.service';
import { initialData } from './data/seed-data';
import { CreateProductDto } from 'src/products/dto/create-product.dto';

@Injectable()
export class SeedService {
  constructor(private readonly productsService: ProductsService) {}
  async runSeed() {
    const result = await this.insertSeed();
    return { msg: 'SEED EXECUTED', data: result };
  }

  private async insertSeed() {
    this.productsService.deleteAllProducts();

    const seedProducts: CreateProductDto[] = initialData.products;

    // Creamos un array de promesas
    const insertPromises = [];
    seedProducts.forEach((product) => {
      insertPromises.push(this.productsService.create(product));
    });

    // ejecutamos todas las promesas
    // de este modo se hacen X consultas, pero todas van a ser al mismo tiempo
    const seedResults = await Promise.all(insertPromises);

    return seedResults;
  }
}
