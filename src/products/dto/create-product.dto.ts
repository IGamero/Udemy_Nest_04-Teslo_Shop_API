import {
  IsString,
  IsNumber,
  IsPositive,
  IsArray,
  IsIn,
  IsOptional,
  MinLength,
  Matches,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  //   @Matches(/^[\S]+$/, { message: 'The slug cannot contain spaces' }) // No permite espacios // Se va a validar de otro modo
  slug?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  stock?: number;

  @IsString({ each: true }) // Cada elemento en el array debe ser string
  @IsArray()
  sizes: string[];

  @IsIn(['male', 'female', 'kid', 'unisex']) // Opciones válidas para el campo "gender"
  @IsString({ each: true })
  gender: string;

  @IsString({ each: true }) // Cada elemento en el array debe ser string
  @IsArray()
  @IsOptional() // Aun siendo obligatorio, tiene un valor por defecto, por lo tanto no es obligatorio en la entidad introducirlo
  tags: string[];

  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  images?: string[];
}
