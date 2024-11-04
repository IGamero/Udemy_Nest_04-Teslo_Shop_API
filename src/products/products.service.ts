import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { isUUID } from 'class-validator';

import { Product, ProductImage } from './entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');
  constructor(
    @InjectRepository(Product) // Se inyecta el repositorio para poder usar las interacciones con bbdd
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage) // Se inyecta el repositorio para poder usar las interacciones con bbdd
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource, // Datos de la operacion
  ) {}
  async create(createProductDto: CreateProductDto) {
    const { images = [], ...productDetails } = createProductDto;
    try {
      // const product: Product = new Product(); // hay formas mas correctas de hacerlo
      const product: Product = this.productRepository.create({
        ...productDetails,
        images: images.map((imageUrl) =>
          this.productImageRepository.create({ url: imageUrl }),
        ),
      }); // crea la instancia del producto, por eso es sincrono

      await this.productRepository.save(product);

      return { ...product, images };
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;
    try {
      const allProducts = await this.productRepository.find({
        where: { status: true },
        take: limit,
        skip: offset,
        order: { slug: 'ASC' },
        relations: {
          images: true,
        },
      });

      // Esta forma es mas facil de EntityMetadataNotFoundError, pero la de abajo es mas especifica
      // return allProducts.map((product) => ({
      //   ...product,
      //   images: product.images.map((image) => image.url),
      // }));

      // Transforma la salida para no enviar mas informacion de la necesaria // Realmente no es necesario hacer
      return allProducts.map(({ images, ...rest }) => ({
        ...rest,
        images: images.map((image) => image.url),
      }));
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
      const queryBuilder = this.productRepository.createQueryBuilder('prod');
      product = await queryBuilder
        .where(
          // 'LOWER(title) = LOWER(:title) OR LOWER(slug) = LOWER(:slug)', // Lower para ignorar mayusculas
          // { title: searchTerm.toLowerCase(), slug: searchTerm.toLowerCase() }, // Convertir el término de búsqueda a minúsculas
          'LOWER(title) = LOWER(:searchTerm) OR slug = :searchTerm', // Slug siempre esta en minus
          { searchTerm: searchTerm.toLowerCase() }, // Convertir el término de búsqueda a minúsculas // Lo mismo pero mas reducido
        )
        .leftJoinAndSelect('prod.images', 'images') // primer param es a lo que accedemos (definido en el qurybuilder), el segundo el alias
        .getOne(); // Obtiene un único resultado en caso de haber varios
    }

    if (!product)
      throw new NotFoundException(
        `Product with ${filterBy} ${searchTerm} not found`,
      );

    return product;
  }

  async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);
    return {
      ...rest,
      images: images.map((image) => image.url),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...productToUpdate } = updateProductDto;

    const product: Product = await this.productRepository.preload({
      id,
      ...productToUpdate,
    });

    if (!product)
      throw new NotFoundException(`Product with id ${id} not found`);

    // Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect(); // conexion a bbdd
    await queryRunner.startTransaction(); // Inicializar transaccion

    try {
      // Si vienen nuevas imagenes es porque se tienen que actualizar por lo tanto borramos las anteriores y creamos las nuevas
      if (images) {
        // si vienen imagenes borramos las imagenes antiguas
        // borra de la tabla "ProductImage" donde id = id enviado por parametro "el del porducto"
        await queryRunner.manager.delete(ProductImage, { product: { id } }); // Entidad afectada , criterio de eliminacion

        // Se añaden las nuevas imagenes para guardar mas adelante
        product.images = images.map((imageUrl) =>
          this.productImageRepository.create({ url: imageUrl }),
        );
      }

      await queryRunner.manager.save(product); // Prepara la consulta para hacerse, pero hasta que no se haga commit no se ejecuta
      // const updatedProduct = await this.productRepository.save(product);

      await queryRunner.commitTransaction(); // Se ejecutan todas las consultas
      await queryRunner.release; // Se cierra queryRunner porque se termino de utilizar

      return this.findOnePlain(id);
      // return updatedProduct;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release; // Se cierra queryRunner porque se termino de utilizar

      this.handleDBExceptions(error);
    }
  }

  async remove(searchTerm: string) {
    const product: Product = await this.findOne(searchTerm);
    const id = product.id;
    const deleteSoft = false;
    let deleted;
    if (!deleteSoft) {
      // Borrar permanentemente el registro
      deleted = await this.productRepository.remove(product);
    } else {
      // Marcar el registro como deshabilitado
      product.status = false;
      deleted = await this.productRepository.save(product);
    }

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

  async deleteAllProducts() {
    if (process.env.NODE_ENV !== 'develop') {
      throw new ForbiddenException(
        'This action can only be performed in the development environment.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Primero, elimina todos los registros de la tabla product
      await queryRunner.manager.delete(Product, {});

      // Luego, usa `TRUNCATE TABLE` para reiniciar el autoincremento
      await queryRunner.query(
        `TRUNCATE TABLE product RESTART IDENTITY CASCADE`,
      );

      await queryRunner.commitTransaction(); // Confirma la transacción si todo va bien
    } catch (error) {
      await queryRunner.rollbackTransaction(); // Revierte la transacción en caso de error
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release(); // Libera el queryRunner al finalizar
    }
  }
}
