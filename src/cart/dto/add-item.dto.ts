import { IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator';

export class AddItemDto {
  @IsString() cartId!: string;

  @ValidateIf((o) => !o.comboId)
  @IsOptional()
  @IsString()
  productId?: string;

  @ValidateIf((o) => !o.productId)
  @IsOptional()
  @IsString()
  comboId?: string;

  @IsNumber() qty!: number;
  @IsOptional() @IsString() unitType?:
    | 'unit'
    | 'kg'
    | 'bunch'
    | 'box'
    | 'combo';
}
