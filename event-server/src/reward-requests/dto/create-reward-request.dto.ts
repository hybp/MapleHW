import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRewardRequestDto {
  @IsMongoId()
  @IsNotEmpty()
  eventId: string;

  @IsMongoId()
  @IsNotEmpty()
  rewardId: string;

  // userId will be taken from the authenticated user (JWT)
  // status will be PENDING by default
  // requestDate will be set automatically
} 
 
 