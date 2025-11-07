import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductImageDto } from './product-image.dto';
import type { UnitType } from '../entities/product.entity';

export class CreateProductDto {
  @IsString() @MaxLength(64) sku!: string;

  @IsString() @MaxLength(160) name!: string;

  @IsOptional() @IsString() @MaxLength(180) slug?: string;

  @IsOptional() @IsString() description?: string;

  @IsEnum(['unit', 'kg', 'bunch', 'box']) unitType!: UnitType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  step!: number;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  minQty!: number;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  maxQty!: number;

  @IsOptional() @IsBoolean() active?: boolean;

  @IsOptional() @IsArray() badges?: string[];

  // categoría: podés pasar ID o slug
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() categorySlug?: string;

  @IsOptional() @IsArray() images?: ProductImageDto[];
}
