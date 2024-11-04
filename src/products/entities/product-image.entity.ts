import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './index';

@Entity({ name: 'product_images' })
export class ProductImage {
  @PrimaryGeneratedColumn() // si no se pasa parametro crea un id unico
  id: number;

  @Column('text')
  url: string;

  @Column('boolean', {
    default: true, // Por defecto, el producto estará activo
  })
  status: boolean;

  // muchas imagenes puedes estar relacionada con UN UNICO producto
  //prettier-ignore
  @ManyToOne(
    () => Product, 
    (product) => product.images,
    { onDelete: 'CASCADE'} // si se borra el producto relacionado, tambien borra las imagenes, para evitar restriccion FK
  )
  product: Product;
}
