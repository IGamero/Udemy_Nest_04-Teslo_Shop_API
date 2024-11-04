import { Injectable } from '@nestjs/common';

@Injectable()
export class SeedService {
  async runSeed() {
    await this.insertSeed();
    return 'SEED EXECUTED';
  }

  private async insertSeed() {
    // this.productService.deleteAllProducts()
    return true;
  }
}
