import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListOrdersDto {
  @IsOptional() @IsString() q?: string; // orderNumber / email / phone
  @IsOptional()
  @IsIn([
    'created',
    'payment_pending',
    'paid',
    'to_pick',
    'packed',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'failed',
  ])
  status?: string;

  @IsOptional() @IsInt() @Min(1) page?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}
