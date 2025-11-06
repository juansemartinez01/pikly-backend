import { IsOptional, IsString } from 'class-validator';
export class AssignDriverDto {
  @IsOptional() @IsString() driverName?: string;
  @IsOptional() @IsString() driverPhone?: string;
}
