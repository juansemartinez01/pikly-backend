import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { UpsertProductPriceDto } from './upsert-product-price.dto';

export class BulkUpsertProductPriceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertProductPriceDto)
  items: UpsertProductPriceDto[];
}
