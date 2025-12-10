import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateComboItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(0.001)
  qty: number;

  @IsString()
  unitType: 'unit' | 'kg' | 'bunch' | 'box';
}

export class CreateComboDto {
  @IsString()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsArray()
  badges?: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsArray()
  items: CreateComboItemDto[];

  // 👇 NUEVO
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  priceListIds?: string[];
}
