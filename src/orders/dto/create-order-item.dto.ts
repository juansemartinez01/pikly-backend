import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const UNIT_TYPES = ['unit', 'kg', 'bunch', 'box', 'combo'] as const;
export type OrderUnitType = (typeof UNIT_TYPES)[number];

export class CreateOrderItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  comboId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string; // snapshot del nombre

  @IsOptional()
  @IsString()
  sku?: string | null;

  @IsString()
  @IsIn(UNIT_TYPES as any)
  unitType!: OrderUnitType; // 'unit' | 'kg' | 'bunch' | 'box' | 'combo'

  @IsNumber()
  @Min(0.001)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number | null;

  @IsNumber()
  @Min(0)
  total!: number; // unitPrice * qty (puede incluir descuentos por ítem)
}
