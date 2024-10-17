import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { isString, isUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { title } from 'process';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');
  constructor(
    @InjectRepository(Product) // Se inyecta el repositorio para poder usar las interacciones con bbdd
    private readonly productRepository: Repository<Product>,
  ) {}
  async create(createProductDto: CreateProductDto) {
    try {
      // const product: Product = new Product(); // hay formas mas correctas de hacerlo
      const product: Product = this.productRepository.create(createProductDto); // crea la instancia del producto, por eso es sincrono
      await this.productRepository.save(product);

      return product;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  findAll(paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;
    try {
      return this.productRepository.find({
        where: { status: true },
        take: limit,
        skip: offset,
        order: { slug: 'ASC' },
        // TODO: relaciones
      });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findOne(searchTerm: string) {
    let product: Product;
    let filterBy;

    // Podemos filtrarlo de manera mas sencilla usando "queryBuilder"
    // // Filtro por id
    // if (isUUID(searchTerm)) {
    //   filterBy = 'id';
    //   product = await this.productRepository.findOneBy({
    //     id: searchTerm,
    //     status: true,
    //   });
    // }

    // // Filtro por title // si tiene espacios
    // if (!product && !isUUID(searchTerm) && searchTerm.includes(' ')) {
    //   filterBy = 'title';
    //   product = await this.productRepository.findOneBy({
    //     title: ILike(searchTerm), // ILIKE para filtrar ignorando caps
    //     status: true,
    //   });
    // }

    // // Filtro por slug
    // if (!product && !isUUID(searchTerm) && !searchTerm.includes(' ')) {
    //   filterBy = 'slug';
    //   product = await this.productRepository.findOneBy({
    //     slug: searchTerm,
    //     status: true,
    //   });
    // }

    if (isUUID(searchTerm)) {
      filterBy = 'id';
      product = await this.productRepository.findOneBy({
        id: searchTerm,
        status: true,
      });
    } else {
      filterBy = 'title or slug';
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder
        .where(
          // 'LOWER(title) = LOWER(:title) OR LOWER(slug) = LOWER(:slug)', // Lower para ignorar mayusculas
          // { title: searchTerm.toLowerCase(), slug: searchTerm.toLowerCase() }, // Convertir el término de búsqueda a minúsculas
          'LOWER(title) = LOWER(:searchTerm) OR slug = :searchTerm', // Slug siempre esta en minus
          { searchTerm: searchTerm.toLowerCase() }, // Convertir el término de búsqueda a minúsculas // Lo mismo pero mas reducido
        )
        .getOne(); // Obtiene un único resultado en caso de haber varios
    }

    if (!product)
      throw new NotFoundException(
        `Product with ${filterBy} ${searchTerm} not found`,
      );

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    try {
      const product: Product = await this.productRepository.preload({
        // Preload busca un objeto por id y las carga usando los datos pasados.
        // Busca el producto y actualiza el objeto
        id: id,
        ...updateProductDto,
      });

      if (!product)
        throw new NotFoundException(`Product with id ${id} not found`);

      const updatedProduct = await this.productRepository.save(product);

      return updatedProduct;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(searchTerm: string) {
    const product: Product = await this.findOne(searchTerm);
    const id = product.id;
    // Borrar permanentemente el registro
    // const deleted = await this.productRepository.remove(product);

    // Marcar el registro como deshabilitado
    product.status = false;
    const deleted = await this.productRepository.save(product);

    deleted.id = id;
    return deleted;
  }

  private handleDBExceptions(error: any) {
    // console.log(error);
    if (error.code === '23505') throw new BadRequestException(error.detail);

    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error on product controller',
    );
  }
}
