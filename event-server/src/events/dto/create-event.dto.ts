import { IsString, IsNotEmpty, IsDateString, IsArray, ValidateNested, IsEnum, IsOptional, MinLength, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus } from '../enums/event-status.enum';
import { EventCondition as EventConditionEnum } from '../enums/condition-type.enum'; // Renamed to avoid conflict

export class EventConditionDto {
  @IsEnum(EventConditionEnum)
  @IsNotEmpty()
  type: EventConditionEnum;

  @IsNotEmpty() // Type will depend on the condition, number for now
  target: any; // number for LOGIN_STREAK, FRIEND_INVITE etc.

  @IsOptional()
  details?: any;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string; // ISO Date String

  @IsDateString()
  @IsNotEmpty()
  endDate: string; // ISO Date String

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventConditionDto)
  conditions: EventConditionDto[];

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  // createdBy will be set from the authenticated user (OPERATOR/ADMIN) in the service
} 
 
 