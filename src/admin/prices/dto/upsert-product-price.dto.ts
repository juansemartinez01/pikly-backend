import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpsertProductPriceDto {
  // Identificación del producto
  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  productSku?: string;

  // Identificación de la lista
  @IsUUID()
  @IsOptional()
  priceListId?: string;

  @IsString()
  @IsOptional()
  priceListName?: string;

  // Valores
  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  compareAtPrice?: number;

  // Ventana de vigencia
  @IsDateString()
  @IsOptional()
  validFrom?: string; // default: ahora

  @IsDateString()
  @IsOptional()
  validTo?: string; // opcional (abierto)

  // Si viene true, cerramos cualquier precio vigente previo y creamos uno nuevo.
  @IsBoolean()
  @IsOptional()
  replaceActive?: boolean = true;
}
