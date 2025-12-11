import {
  IsDateString,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';

export class CreateDeliverySlotDto {
  @IsDateString()
  date!: string; // YYYY-MM-DD

  @IsString()
  startTime!: string; // HH:mm:ss

  @IsString()
  endTime!: string; // HH:mm:ss

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number = 50;

  @IsOptional()
  @IsUUID()
  zoneId?: string | null;
}
