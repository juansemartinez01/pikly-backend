import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class ProductImageDto {
  @IsOptional() @IsString() id?: string; // por si editás existentes
  @IsUrl() url!: string;
  @IsOptional() @IsString() alt?: string;
  @IsOptional() @IsInt() @Min(0) order?: number;
}
