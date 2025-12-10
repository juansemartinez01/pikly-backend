import { PartialType } from '@nestjs/mapped-types';
import { CreateComboDto, CreateComboItemDto } from './create-combo.dto';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateComboDto extends PartialType(CreateComboDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateComboItemDto)
  items?: CreateComboItemDto[];
}
