import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
// Import other modules (Events, Rewards, RewardRequests) once created
// import { EventsModule } from './events/events.module';
// import { RewardsModule } from './rewards/rewards.module';
// import { RewardRequestsModule } from './reward-requests/reward-requests.module';
import { EventsModule } from './events/events.module';
import { RewardsModule } from './rewards/rewards.module';
import { RewardRequestsModule } from './reward-requests/reward-requests.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    EventsModule,
    RewardsModule,
    RewardRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
