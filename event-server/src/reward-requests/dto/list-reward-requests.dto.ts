import { IsOptional, IsString, IsEnum, IsDateString, IsMongoId } from 'class-validator';
import { Transform } from 'class-transformer';
import { RewardRequestStatus } from '../enums/reward-request-status.enum';

export class ListRewardRequestsDto {
  @IsOptional()
  @IsMongoId()
  eventId?: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsEnum(RewardRequestStatus)
  status?: RewardRequestStatus;

  @IsOptional()
  @IsDateString()
  dateFrom?: string; // ISO Date string

  @IsOptional()
  @IsDateString()
  dateTo?: string; // ISO Date string

  // Basic pagination - can be expanded later
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;
} 