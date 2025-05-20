import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from './enums/event-status.enum';

@Injectable()
export class EventsService {
  constructor(@InjectModel(Event.name) private eventModel: Model<EventDocument>) {}

  async create(createEventDto: CreateEventDto, createdBy: string): Promise<EventDocument> {
    // Basic validation for startDate vs endDate
    if (new Date(createEventDto.startDate) >= new Date(createEventDto.endDate)) {
      throw new BadRequestException('시작일은 종료일보다 이전이어야 합니다.');
    }

    const newEvent = new this.eventModel({
      ...createEventDto,
      createdBy: new Types.ObjectId(createdBy), // Assuming createdBy is a valid ObjectId string
      status: createEventDto.status || EventStatus.INACTIVE, // Default to INACTIVE if not provided
    });
    return newEvent.save();
  }

  async findAll(): Promise<EventDocument[]> {
    return this.eventModel.find().exec();
  }

  async findOne(id: string): Promise<EventDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('잘못된 이벤트 ID 형식입니다.');
    }
    const event = await this.eventModel.findById(id).exec();
    if (!event) {
      throw new NotFoundException(`ID ${id}에 해당하는 이벤트를 찾을 수 없습니다.`);
    }
    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto, userId: string): Promise<EventDocument> {
    const event = await this.findOne(id);
    // Add authorization check: only creator or admin can update (simplified here)
    // if (event.createdBy.toString() !== userId && !userHasAdminRole) { throw new ForbiddenException(); }

    if (updateEventDto.startDate && updateEventDto.endDate && new Date(updateEventDto.startDate) >= new Date(updateEventDto.endDate)) {
        throw new BadRequestException('시작일은 종료일보다 이전이어야 합니다.');
    }
    if (updateEventDto.startDate && !updateEventDto.endDate && new Date(updateEventDto.startDate) >= new Date(event.endDate)) {
        throw new BadRequestException('시작일은 기존 종료일보다 이전이어야 합니다.');
    }
    if (updateEventDto.endDate && !updateEventDto.startDate && new Date(event.startDate) >= new Date(updateEventDto.endDate)) {
        throw new BadRequestException('기존 시작일은 새 종료일보다 이전이어야 합니다.');
    }

    Object.assign(event, updateEventDto);
    return event.save();
  }

  async updateStatus(id: string, status: EventStatus, userId: string): Promise<EventDocument> {
    const event = await this.findOne(id);
    // Add authorization check: only creator or admin can update status (simplified here)
    // if (event.createdBy.toString() !== userId && !userHasAdminRole) { throw new ForbiddenException(); }

    event.status = status;
    return event.save();
  }

  // For Rewards service to check if an event exists
  async doesEventExist(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const event = await this.eventModel.findById(id).select('_id').lean();
    return !!event;
  }
}
