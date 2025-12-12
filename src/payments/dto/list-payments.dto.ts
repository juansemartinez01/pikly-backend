import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListPaymentsDto {
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  provider?: string; // 'mercadopago', 'manual', 'efectivo', etc.

  @IsOptional()
  @IsString()
  status?: string; // 'pending', 'approved', 'rejected', 'refunded', etc.

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
