import { IsOptional, IsString } from 'class-validator';

export class AddressDto {
  @IsString() street!: string;
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsString() floor?: string;
  @IsOptional() @IsString() apartment?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() zip?: string;
  @IsOptional() @IsString() notes?: string;
}
