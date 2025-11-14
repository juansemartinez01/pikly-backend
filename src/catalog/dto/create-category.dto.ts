import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(140)
  slug?: string;

  @IsInt()
  @IsOptional()
  order?: number = 0;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;
}
