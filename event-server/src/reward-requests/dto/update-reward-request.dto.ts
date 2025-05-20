import { IsEnum, IsOptional, IsString, IsMongoId, IsNotEmpty } from 'class-validator';
import { RewardRequestStatus } from '../enums/reward-request-status.enum';

export class UpdateRewardRequestDto {
  @IsEnum(RewardRequestStatus)
  @IsNotEmpty()
  status: RewardRequestStatus;

  @IsOptional()
  @IsString()
  notes?: string;
  
  // processedBy will be set from the authenticated user (OPERATOR/ADMIN) in the service
  // processDate will be set automatically when status changes from PENDING
} 
 
 