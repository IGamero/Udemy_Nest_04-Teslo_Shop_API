import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return {
      statusCode: 200,
      message: 'product created',
      // product,
      // data: product,
      data: { product }, // data: { product: { productData }}
    };
  }

  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    const allProducts = await this.productsService.findAll(paginationDto); // Obtiene la lista de productos
    const total = allProducts.length;

    return {
      statusCode: 200,
      message: 'all products',
      total,
      data: { allProducts },
    };
  }

  @Get(':searchTerm')
  findOne(@Param('searchTerm') searchTerm: string) {
    return this.productsService.findOnePlain(searchTerm);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const updatedProduct = await this.productsService.update(
      id,
      updateProductDto,
    );
    return {
      statusCode: 200,
      message: 'update Product',
      data: { updatedProduct },
    };
  }

  @Delete(':searchTerm')
  // Solo borra por uuid
  async remove(@Param('searchTerm', ParseUUIDPipe) searchTerm: string) {
    const deletedProduct = await this.productsService.remove(searchTerm);

    return {
      statusCode: 200,
      data: { deletedProduct },
    };
  }
}
