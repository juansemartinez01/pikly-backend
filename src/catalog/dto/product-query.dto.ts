import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ProductQueryDto {
  @IsOptional() @IsString() q?: string; // búsqueda
  @IsOptional() @IsString() category?: string; // slug de categoría
  @IsOptional() @IsString() priceList?: string; // nombre de lista (Retail/Mayorista)
  @IsOptional() @IsString() badge?: string; // 'Oferta'/'Premium'/...

  @IsOptional() @IsInt() @Min(1) page?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;

  @IsOptional()
  @IsIn(['price_asc', 'price_desc', 'name_asc', 'name_desc'])
  sort?: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';
}
