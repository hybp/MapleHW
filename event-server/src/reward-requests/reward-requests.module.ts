import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { RewardRequestsService } from './reward-requests.service';
import { RewardRequestsController } from './reward-requests.controller';
import { RewardRequest, RewardRequestSchema } from './schemas/reward-request.schema';
import { EventsModule } from '../events/events.module';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RewardRequest.name, schema: RewardRequestSchema }]),
    HttpModule,
    EventsModule,  // For validating eventId
    RewardsModule, // For validating rewardId and its association with eventId
  ],
  controllers: [RewardRequestsController],
  providers: [RewardRequestsService],
  exports: [RewardRequestsService]
})
export class RewardRequestsModule {}
