// src/orders/dto/upsert-weekday-slots.dto.ts
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export type WeekdayName =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

export class WeekdaySlotInputDto {
  @IsString()
  startTime: string; // '10:00:00'

  @IsString()
  endTime: string; // '13:00:00'

  @IsOptional()
  @IsInt()
  capacity?: number;

  @IsOptional()
  @IsUUID()
  zoneId?: string;
}

export class UpsertWeekdaySlotsDto {
  @IsEnum([
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO',
  ])
  weekday: WeekdayName;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeekdaySlotInputDto)
  slots: WeekdaySlotInputDto[];
}
