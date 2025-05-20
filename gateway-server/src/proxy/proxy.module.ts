import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule, // ConfigService is used by ProxyController & HttpModule.registerAsync
    HttpModule.registerAsync({
      imports: [ConfigModule], // HttpModule needs ConfigService for its factory
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get('HTTP_TIMEOUT', 5000),
        maxRedirects: configService.get('HTTP_MAX_REDIRECTS', 5),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ProxyController],
  // No providers needed here unless ProxyController depends on a service specific to this module
})
export class ProxyModule {}
