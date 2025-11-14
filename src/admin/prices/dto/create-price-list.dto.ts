import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePriceListDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsInt()
  @IsOptional()
  priority?: number = 100;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;
}
