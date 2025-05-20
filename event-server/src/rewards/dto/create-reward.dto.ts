import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsMongoId } from 'class-validator';
import { RewardType } from '../enums/reward-type.enum';

export class CreateRewardDto {
  @IsMongoId()
  @IsNotEmpty()
  eventId: string; // Will be ObjectId, validated as MongoId string

  @IsEnum(RewardType)
  @IsNotEmpty()
  type: RewardType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  quantity: number;
} 
 
 