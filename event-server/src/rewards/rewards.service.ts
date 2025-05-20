import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reward, RewardDocument } from './schemas/reward.schema';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { EventsService } from '../events/events.service'; // To validate eventId

@Injectable()
export class RewardsService {
  constructor(
    @InjectModel(Reward.name) private rewardModel: Model<RewardDocument>,
    private readonly eventsService: EventsService,
  ) {}

  async create(createRewardDto: CreateRewardDto, createdByUserId: string /*, userRole: Role */): Promise<RewardDocument> {
    // Check if eventId is valid and exists
    if (!Types.ObjectId.isValid(createRewardDto.eventId)) {
        throw new BadRequestException('잘못된 이벤트 ID 형식입니다.');
    }
    const eventExists = await this.eventsService.doesEventExist(createRewardDto.eventId);
    if (!eventExists) {
      throw new NotFoundException(`ID ${createRewardDto.eventId}에 해당하는 이벤트를 찾을 수 없습니다.`);
    }

    // Authorization: Only OPERATOR/ADMIN can create rewards (handled in controller)

    const newReward = new this.rewardModel({
        ...createRewardDto,
        eventId: new Types.ObjectId(createRewardDto.eventId)
    });
    return newReward.save();
  }

  async findAllForEvent(eventId: string): Promise<RewardDocument[]> {
    if (!Types.ObjectId.isValid(eventId)) {
        throw new BadRequestException('잘못된 이벤트 ID 형식입니다.');
    }
    return this.rewardModel.find({ eventId: new Types.ObjectId(eventId) }).exec();
  }

  async findOne(id: string): Promise<RewardDocument> {
    if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('잘못된 보상 ID 형식입니다.');
    }
    const reward = await this.rewardModel.findById(id).exec();
    if (!reward) {
      throw new NotFoundException(`ID ${id}에 해당하는 보상을 찾을 수 없습니다.`);
    }
    return reward;
  }

  async update(id: string, updateRewardDto: UpdateRewardDto, userId: string /*, userRole: Role */): Promise<RewardDocument> {
    const reward = await this.findOne(id);
    
    // Authorization: Only OPERATOR/ADMIN can update (handled in controller)
    // Optional: Check if the eventId is being changed and if the new one exists
    if (updateRewardDto.eventId) {
        if (!Types.ObjectId.isValid(updateRewardDto.eventId)) {
            throw new BadRequestException('업데이트를 위한 이벤트 ID 형식이 잘못되었습니다.');
        }
        const eventExists = await this.eventsService.doesEventExist(updateRewardDto.eventId);
        if (!eventExists) {
            throw new NotFoundException(`업데이트를 위해 ID ${updateRewardDto.eventId}에 해당하는 이벤트를 찾을 수 없습니다.`);
        }
    }

    Object.assign(reward, updateRewardDto);
    return reward.save();
  }

  async delete(id: string, userId: string /*, userRole: Role */): Promise<{ deleted: boolean; id: string }> {
    const reward = await this.findOne(id); // Ensures reward exists
    // Authorization: Only OPERATOR/ADMIN can delete (handled in controller)
    
    const result = await this.rewardModel.deleteOne({ _id: new Types.ObjectId(id) }).exec();
    if (result.deletedCount === 0) {
        throw new NotFoundException(`삭제를 위해 ID ${id}에 해당하는 보상을 찾을 수 없습니다.`);
    }
    return { deleted: true, id };
  }
}
