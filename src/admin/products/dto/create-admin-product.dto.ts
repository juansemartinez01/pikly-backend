// src/catalog/dto/create-admin-product.dto.ts
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdminProductImageDto } from './admin-product-image.dto';

const UNIT_TYPES = ['unit', 'kg', 'bunch', 'box'] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export class CreateAdminProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sku: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(180)
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(UNIT_TYPES as any)
  unitType: UnitType;

  @IsNumber()
  @Min(0.001)
  step: number;

  @IsNumber()
  @Min(0.001)
  minQty: number;

  @IsNumber()
  @Min(0.001)
  maxQty: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  categoryIds?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  badges?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductImageDto)
  @IsOptional()
  images?: AdminProductImageDto[];

  // precio inicial opcional
  @IsNumber()
  @IsOptional()
  @Min(0)
  initialPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  initialCompareAtPrice?: number;

  @IsString()
  @IsOptional()
  initialPriceListName?: string; // por defecto usa price list activa de mayor prioridad
}
