import {
  IsArray,
  IsBoolean,
  IsIn,
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

export class UpdateAdminProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(64)
  sku?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(180)
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(UNIT_TYPES as any)
  unitType?: UnitType;

  @IsNumber()
  @IsOptional()
  @Min(0.001)
  step?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.001)
  minQty?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.001)
  maxQty?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  badges?: string[];

  // Si se envía, reemplaza imágenes completas
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductImageDto)
  @IsOptional()
  images?: AdminProductImageDto[];
}
