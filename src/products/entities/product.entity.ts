import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', {
    unique: true, // No puede repetirse
  })
  title: string;

  @Column('float', {
    default: 0,
  })
  price: number;

  @Column({
    type: 'text', // Es lo mismo que ponerlo como arriba
    nullable: true,
  })
  description: string;

  @Column('text', {
    unique: true,
  })
  slug: string;

  @Column('int', {
    default: 0,
  })
  stock: number;

  @Column('text', {
    array: true,
  })
  sizes: string[];

  @Column('text')
  gender: string;

  @Column('text', {
    array: true,
    default: [],
  })
  tags: string[];

  // images

  @Column('boolean', {
    default: true, // Por defecto, el producto estará activo
  })
  status: boolean;

  //   Validaciones antes de insertar un registro
  @BeforeInsert()
  checkSlugInsert() {
    if (!this.slug) {
      this.slug = this.title;
    }

    this.slug = this.slug
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, '') // Elimina caracteres no permitidos (excepto espacios y guiones bajos)
      .replaceAll(' ', '_'); // Reemplaza los espacios por guiones bajos
  }

  @BeforeUpdate()
  checkSlugUpdate() {
    // La diferencia entre el check para insert es que no toma como predeterminado el valor de this.title, sinoq ue respeta el que habia
    if (this.slug) {
      if (this.slug) {
        this.slug = this.slug
          .toLowerCase()
          .replace(/[^a-z0-9_\s]/g, '') // Elimina caracteres no permitidos (excepto espacios y guiones bajos)
          .replaceAll(' ', '_'); // Reemplaza los espacios por guiones bajos
      }
    }
  }
}
