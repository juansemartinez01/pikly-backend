import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdatePriceListDto {
  @IsString()
  @IsOptional()
  @MaxLength(80)
  name?: string;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
