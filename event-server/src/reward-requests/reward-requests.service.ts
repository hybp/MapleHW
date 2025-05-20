import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import { RewardRequest, RewardRequestDocument } from './schemas/reward-request.schema';
import { CreateRewardRequestDto } from './dto/create-reward-request.dto';
import { UpdateRewardRequestDto } from './dto/update-reward-request.dto';
import { EventsService } from '../events/events.service';
import { RewardsService } from '../rewards/rewards.service';
import { RewardRequestStatus } from './enums/reward-request-status.enum';
import { Event as EventEntity } from '../events/schemas/event.schema';
import { EventCondition as EventConditionEnum } from '../events/enums/condition-type.enum';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RewardType } from '../rewards/enums/reward-type.enum';
import { Reward } from '../rewards/schemas/reward.schema';
import { Role } from '../auth/roles.enum';
import { EventStatus } from '../events/enums/event-status.enum';
import { RewardDocument } from '../rewards/schemas/reward.schema';
import { ListRewardRequestsDto } from './dto/list-reward-requests.dto';

interface EventConditionConfig {
  type: EventConditionEnum;
  target: number;
  details?: any;
}

@Injectable()
export class RewardRequestsService {
  private readonly logger = new Logger(RewardRequestsService.name);

  constructor(
    @InjectModel(RewardRequest.name) private rewardRequestModel: Model<RewardRequestDocument>,
    private readonly eventsService: EventsService,
    private readonly rewardsService: RewardsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async submitRequest(createDto: CreateRewardRequestDto, userId: string): Promise<RewardRequestDocument> {
    const { eventId, rewardId } = createDto;

    if (!Types.ObjectId.isValid(eventId) || !Types.ObjectId.isValid(rewardId) || !Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('이벤트, 보상 또는 사용자 ID 형식이 잘못되었습니다.');
    }

    // 1. Validate Event and Reward exist
    const event = await this.eventsService.findOne(eventId);
    if (!event) throw new NotFoundException(`이벤트 ${eventId}를 찾을 수 없습니다.`);
    if (event.status !== 'ACTIVE') throw new BadRequestException(`이벤트 ${eventId}가 활성 상태가 아닙니다.`);
    
    const reward = await this.rewardsService.findOne(rewardId);
    if (!reward) throw new NotFoundException(`보상 ${rewardId}를 찾을 수 없습니다.`);
    if (reward.eventId.toString() !== eventId) {
      throw new BadRequestException(`보상 ${rewardId}는 이벤트 ${eventId}에 속하지 않습니다.`);
    }

    // 2. Check for duplicate request (based on schema index: userId, eventId, rewardId)
    const existingRequest = await this.rewardRequestModel.findOne({
      userId: new Types.ObjectId(userId),
      eventId: new Types.ObjectId(eventId),
      rewardId: new Types.ObjectId(rewardId),
    }).exec();
    if (existingRequest) {
      throw new ConflictException('이미 해당 이벤트에 대한 보상을 요청했습니다.');
    }

    // 3. Verify event conditions for the user
    const conditionsMet = await this.checkAllEventConditions(userId, event);
    if (!conditionsMet) { 
      throw new BadRequestException('이벤트 조건을 충족하지 못했습니다.'); 
    }

    const newRequest = new this.rewardRequestModel({
      userId: new Types.ObjectId(userId),
      eventId: new Types.ObjectId(eventId),
      rewardId: new Types.ObjectId(rewardId),
      status: RewardRequestStatus.PENDING, // Default status
      // requestDate is set by timestamps
    });
    return newRequest.save();
  }

  async findUserRequests(userId: string): Promise<RewardRequestDocument[]> {
    if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('잘못된 사용자 ID 형식입니다.');
    }
    return this.rewardRequestModel.find({ userId: new Types.ObjectId(userId) }).populate('eventId rewardId').exec();
  }

  async findAllRequests(queryParams: ListRewardRequestsDto): Promise<RewardRequestDocument[]> {
    const { eventId, userId, status, dateFrom, dateTo, page = 1, limit = 10 } = queryParams;

    const filters: any = {};

    if (eventId) {
      if (!Types.ObjectId.isValid(eventId)) throw new BadRequestException('잘못된 eventId 형식입니다.');
      filters.eventId = new Types.ObjectId(eventId);
    }
    if (userId) {
      if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('잘못된 userId 형식입니다.');
      filters.userId = new Types.ObjectId(userId);
    }
    if (status) {
      filters.status = status;
    }

    if (dateFrom || dateTo) {
      filters.requestDate = {};
      if (dateFrom) {
        filters.requestDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        // To include the whole end day, set time to end of day or add 1 day and use $lt
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Include the whole day
        filters.requestDate.$lte = toDate;
      }
    }
    
    const skip = (page - 1) * limit;

    this.logger.debug(`Finding all reward requests with filters: ${JSON.stringify(filters)}, page: ${page}, limit: ${limit}`);

    return this.rewardRequestModel
      .find(filters)
      .populate('userId eventId rewardId')
      .sort({ requestDate: -1 }) // Default sort by most recent
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findRequestById(id: string): Promise<RewardRequestDocument> {
    if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('잘못된 요청 ID 형식입니다.');
    }
    const request = await this.rewardRequestModel.findById(id).populate('userId eventId rewardId').exec();
    if (!request) {
      throw new NotFoundException(`ID ${id}에 해당하는 보상 요청을 찾을 수 없습니다.`);
    }
    return request;
  }

  async updateRequestStatus(
    id: string, 
    updateDto: UpdateRewardRequestDto, 
    processedByUserId: string
  ): Promise<RewardRequestDocument> {
    const request = await this.findRequestById(id);

    if (request.status !== RewardRequestStatus.PENDING && 
        (updateDto.status === RewardRequestStatus.APPROVED || updateDto.status === RewardRequestStatus.REJECTED)) {
      // Allow updating notes even if already processed, but not status from final to final.
      // More complex logic might be needed if status can be reverted.
      if (request.status === updateDto.status && updateDto.notes) {
         // just updating notes on an already processed request
      } else {
        throw new BadRequestException(`요청이 이미 처리되어 상태를 ${request.status}에서 ${updateDto.status}(으)로 변경할 수 없습니다.`);
      }
    }

    request.status = updateDto.status;
    request.notes = updateDto.notes || request.notes; // Keep existing notes if not provided
    
    if (updateDto.status === RewardRequestStatus.APPROVED || updateDto.status === RewardRequestStatus.REJECTED) {
      request.processedBy = new Types.ObjectId(processedByUserId);
      request.processDate = new Date();
      
      if (updateDto.status === RewardRequestStatus.APPROVED) {
        // Ensure reward is populated for distribution logic
        // The findRequestById already populates rewardId with the full RewardDocument object if the path was set up to autopopulate or it was populated before.
        // However, to be certain and to get the correctly typed object, we populate it here.
        // Mongoose `populate` mutates the document and returns it.
        const populatedRequest = await request.populate<{ rewardId: RewardDocument | Types.ObjectId }>('rewardId');

        // Check if rewardId is indeed populated and is a RewardDocument
        if (!(populatedRequest.rewardId instanceof Document)) {
            this.logger.error(`보상 ID ${populatedRequest.rewardId}가 요청 ${populatedRequest._id}에 대해 제대로 채워지지 않았습니다. 지급할 수 없습니다.`);
            populatedRequest.notes = `${populatedRequest.notes || ''} 오류: 지급을 위한 보상 정보를 불러올 수 없습니다.`.trim();
            // No call to distributeReward, will proceed to save with error in notes.
        } else {
            await this.distributeReward(populatedRequest as RewardRequestDocument & { rewardId: RewardDocument });
        }
      }
    }

    return request.save();
  }

  private async distributeReward(request: RewardRequestDocument & { rewardId: RewardDocument }): Promise<void> {
    const reward = request.rewardId; // No more casting needed here, it's already RewardDocument

    if (!reward || !reward.type) { // Should be safe given the check above, but good for robustness
      this.logger.error(`요청 ${request._id}에 대한 보상 정보가 없거나 보상 유형이 누락되어 지급할 수 없습니다.`);
      // Notes are handled by the check before calling distributeReward or if an error occurs during distribution itself
      return;
    }

    this.logger.log(`요청 ${request._id}에 대해 사용자 ${request.userId}에게 보상 유형 ${reward.type} 지급 중`);

    let distributionDetailMessage = '';
    let distributionSuccess = false;

    try {
      switch (reward.type) {
        case RewardType.POINTS:
          const pointsToDistribute = reward.quantity;
          this.logger.log(`사용자 ${request.userId}에게 ${pointsToDistribute} 포인트 지급 시도 중.`);
          const userServiceUrl = this.configService.get<string>('USER_SERVICE_URL');
          if (!userServiceUrl) {
            distributionDetailMessage = '사용자 서비스 URL이 구성되지 않았습니다. 포인트를 지급할 수 없습니다.';
            this.logger.error(distributionDetailMessage);
            break;
          }
          await this.httpService.post(`${userServiceUrl}/users/${request.userId}/points/credit`, {
            points: pointsToDistribute,
            sourceEventId: request.eventId.toString(),
            sourceRewardId: reward._id.toString(), // Now reward._id is correctly typed
          }).toPromise();
          distributionDetailMessage = `${pointsToDistribute} 포인트가 성공적으로 지급되었습니다.`;
          this.logger.log(distributionDetailMessage);
          distributionSuccess = true;
          break;

        case RewardType.ITEM:
          const itemDetails = reward.name;
          this.logger.log(`사용자 ${request.userId}에게 아이템 '${itemDetails}'(수량: ${reward.quantity}) 지급 시도 중.`);
          const inventoryServiceUrl = this.configService.get<string>('INVENTORY_SERVICE_URL');
          if (!inventoryServiceUrl) {
            distributionDetailMessage = '인벤토리 서비스 URL이 구성되지 않았습니다. 아이템을 지급할 수 없습니다.';
            this.logger.error(distributionDetailMessage);
            break;
          }
          await this.httpService.post(`${inventoryServiceUrl}/users/${request.userId}/inventory/add`, {
            itemId: reward.name,
            quantity: reward.quantity,
            sourceEventId: request.eventId.toString(),
            sourceRewardId: reward._id.toString(), // Now reward._id is correctly typed
          }).toPromise();
          distributionDetailMessage = `아이템 '${itemDetails}'(수량: ${reward.quantity})이(가) 성공적으로 지급되었습니다.`;
          this.logger.log(distributionDetailMessage);
          distributionSuccess = true;
          break;

        case RewardType.COUPON:
          const couponDetails = reward.name;
          this.logger.log(`사용자 ${request.userId}에게 쿠폰 '${couponDetails}' 지급 시도 중.`);
          const couponServiceUrl = this.configService.get<string>('COUPON_SERVICE_URL');
          if (!couponServiceUrl) {
            distributionDetailMessage = '쿠폰 서비스 URL이 구성되지 않았습니다. 쿠폰을 지급할 수 없습니다.';
            this.logger.error(distributionDetailMessage);
            break;
          }
          await this.httpService.post(`${couponServiceUrl}/users/${request.userId}/coupons/issue`, {
            couponCode: couponDetails, // Or couponId, depending on coupon service API
            sourceEventId: request.eventId.toString(),
            sourceRewardId: reward._id.toString(), // Now reward._id is correctly typed
          }).toPromise();
          distributionDetailMessage = `쿠폰 '${couponDetails}'이(가) 성공적으로 지급되었습니다.`;
          this.logger.log(distributionDetailMessage);
          distributionSuccess = true;
          break;
        default:
          distributionDetailMessage = `알 수 없는 보상 유형: ${reward.type}. 지급할 수 없습니다.`;
          this.logger.warn(distributionDetailMessage);
      }
    } catch (error) {
      this.logger.error(`사용자 ${request.userId}에 대한 보상 지급 중 오류 발생 (요청 ID: ${request._id}, 보상 ID: ${reward._id}, 유형: ${reward.type}): ${error.message}`, error.stack);
      distributionDetailMessage = `보상 지급 중 오류 발생: ${error.message}`;
      distributionSuccess = false; // Ensure success is false on error
    }

    request.distributionDetails = distributionDetailMessage;
    if (distributionSuccess) {
      request.distributedAt = new Date();
      request.status = RewardRequestStatus.COMPLETED; // Mark as completed after successful distribution
    } else {
      // If distribution failed, append to notes and potentially set to an error status or keep as APPROVED for retry?
      // For now, keeping status as APPROVED but updating notes reflects the attempt and failure.
      request.notes = `${request.notes || ''} 지급 실패: ${distributionDetailMessage}`.trim();
      // Optionally, change status to a specific FAILED_DISTRIBUTION status if one exists
      // request.status = RewardRequestStatus.FAILED_DISTRIBUTION;
    }
    // Save is done by the caller (updateRequestStatus)
  }

  private async checkAllEventConditions(userId: string, event: EventEntity): Promise<boolean> {
    this.logger.log(`Checking all conditions for event ${event._id} for user ${userId}`);
    if (!event.conditions || event.conditions.length === 0) {
      this.logger.log('No conditions defined for this event. Proceeding.');
      return true; // No conditions to check
    }

    for (const condition of event.conditions as unknown as EventConditionConfig[]) { // Cast needed due to Mongoose raw schema
      const conditionFulfilled = await this.verifyUserCondition(userId, condition);
      if (!conditionFulfilled) {
        this.logger.warn(`User ${userId} failed condition ${condition.type} for event ${event._id}`);
        return false;
      }
    }
    this.logger.log(`All conditions met for event ${event._id} for user ${userId}`);
    return true;
  }

  private async verifyUserCondition(userId: string, condition: EventConditionConfig): Promise<boolean> {
    this.logger.log(`Verifying condition type: ${condition.type}, target: ${condition.target} for user ${userId}`);
    try {
      switch (condition.type) {
        case EventConditionEnum.LOGIN_STREAK:
          this.logger.log(`Verifying LOGIN_STREAK of ${condition.target} days.`);
          const userActivityServiceUrl = this.configService.get<string>('USER_ACTIVITY_SERVICE_URL');
          if (!userActivityServiceUrl) {
            this.logger.error('USER_ACTIVITY_SERVICE_URL not configured. Condition check failed.');
            return false;
          }
          // Hypothetical endpoint: GET /users/:userId/login-streak -> { streak: number }
          const loginStreakResponse = await this.httpService.get(`${userActivityServiceUrl}/users/${userId}/login-streak`).toPromise();
          if (loginStreakResponse && loginStreakResponse.data && loginStreakResponse.data.streak >= condition.target) {
            this.logger.log(`LOGIN_STREAK condition met: ${loginStreakResponse.data.streak} >= ${condition.target}`);
            return true;
          }
          this.logger.warn(`LOGIN_STREAK condition not met: ${loginStreakResponse?.data?.streak} < ${condition.target}`);
          return false;

        case EventConditionEnum.FRIEND_INVITE:
          this.logger.log(`Verifying FRIEND_INVITE of ${condition.target} friends.`);
          const referralServiceUrl = this.configService.get<string>('REFERRAL_SERVICE_URL');
          if (!referralServiceUrl) {
            this.logger.error('REFERRAL_SERVICE_URL not configured. Condition check failed.');
            return false;
          }
          // Hypothetical endpoint: GET /users/:userId/referrals/count -> { count: number }
          const friendInviteResponse = await this.httpService.get(`${referralServiceUrl}/users/${userId}/referrals/count`).toPromise();
          if (friendInviteResponse && friendInviteResponse.data && friendInviteResponse.data.count >= condition.target) {
            this.logger.log(`FRIEND_INVITE condition met: ${friendInviteResponse.data.count} >= ${condition.target}`);
            return true;
          }
          this.logger.warn(`FRIEND_INVITE condition not met: ${friendInviteResponse?.data?.count} < ${condition.target}`);
          return false;

        case EventConditionEnum.QUEST_COMPLETION:
          this.logger.log(`Verifying QUEST_COMPLETION ID ${condition.target}.`);
          const questServiceUrl = this.configService.get<string>('QUEST_SERVICE_URL');
          if (!questServiceUrl) {
            this.logger.error('QUEST_SERVICE_URL not configured. Condition check failed.');
            return false;
          }
          // Hypothetical endpoint: GET /users/:userId/quests/:questId/status -> { completed: boolean }
          // Here, condition.target is assumed to be the quest ID.
          const questCompletionResponse = await this.httpService.get(`${questServiceUrl}/users/${userId}/quests/${condition.target}/status`).toPromise();
          if (questCompletionResponse && questCompletionResponse.data && questCompletionResponse.data.completed) {
            this.logger.log(`QUEST_COMPLETION condition met for quest ${condition.target}`);
            return true;
          }
          this.logger.warn(`QUEST_COMPLETION condition not met for quest ${condition.target}`);
          return false;

        case EventConditionEnum.PURCHASE_ACTIVITY:
          this.logger.log(`Verifying PURCHASE_ACTIVITY (e.g. min amount ${condition.target}).`);
          const paymentServiceUrl = this.configService.get<string>('PAYMENT_SERVICE_URL');
          if (!paymentServiceUrl) {
            this.logger.error('PAYMENT_SERVICE_URL not configured. Condition check failed.');
            return false;
          }
          // Hypothetical endpoint: GET /users/:userId/purchase-total -> { totalAmount: number }
          // Here, condition.target is assumed to be the minimum purchase amount.
          const purchaseActivityResponse = await this.httpService.get(`${paymentServiceUrl}/users/${userId}/purchase-total`).toPromise();
          if (purchaseActivityResponse && purchaseActivityResponse.data && purchaseActivityResponse.data.totalAmount >= condition.target) {
            this.logger.log(`PURCHASE_ACTIVITY condition met: ${purchaseActivityResponse.data.totalAmount} >= ${condition.target}`);
            return true;
          }
          this.logger.warn(`PURCHASE_ACTIVITY condition not met: ${purchaseActivityResponse?.data?.totalAmount} < ${condition.target}`);
          return false;

        default:
          this.logger.warn(`Unknown condition type: ${(condition as any).type}. Assuming false for safety.`);
          // const _exhaustiveCheck: never = condition.type; // This line will cause a compile error if a case is missed.
          return false;
      }
    } catch (error) {
      this.logger.error(`Error verifying condition ${condition.type} for user ${userId}: ${error.message}`, error.stack);
      // If any service call fails, assume condition not met for safety.
      // More sophisticated error handling might be needed (e.g., retry, or specific error statuses).
      return false;
    }
  }

  async updateEventStatus(eventId: string, status: EventStatus) {
    // RabbitMQ dependency removed
  }

  async updateUserRole(userId: string, newRole: Role) {
    // RabbitMQ dependency removed
  }
}
