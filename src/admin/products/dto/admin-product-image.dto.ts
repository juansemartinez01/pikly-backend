import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class AdminProductImageDto {
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  alt?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  order?: number = 0;
}
