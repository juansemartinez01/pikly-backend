import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './address.dto';

export class CreateOrderItemDto {
  @IsUUID()
  productId!: string; // seguimos usando UUID, NO int

  @IsOptional()
  @IsUUID()
  comboId?: string; // por si en algún momento querés usar combos

  @IsNumber()
  @Min(0.001)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateOrderDto {
  // 👇 YA NO USAMOS cartId
  // @IsString() cartId!: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerFirstName?: string;

  @IsOptional()
  @IsString()
  customerLastName?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  // Podés interpretarlo como "fechaHora" de tu ejemplo
  @IsDateString()
  deliveryDate!: string; // YYYY-MM-DD o fecha ISO, como ya venías usando

  @IsOptional()
  @IsString()
  deliverySlotId?: string;

  @IsOptional()
  @IsBoolean()
  markAsPaid?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
