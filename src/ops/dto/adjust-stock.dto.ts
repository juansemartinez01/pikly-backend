import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AdjustStockDto {
  @IsNumber()
  @Min(0.001)
  qty: number; // cantidad a sumar

  @IsOptional()
  @IsString()
  warehouseId?: string; // opcional, por ahora probablemente null
}
