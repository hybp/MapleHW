import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy'; // Ensure this path is correct
// import { JwtStrategy } from './auth/jwt.strategy'; // To be created
import { ProxyModule } from './proxy/proxy.module'; // ProxyModule handles its own controller

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // We can define AUTH_SERVICE_URL and EVENT_SERVICE_URL here or use docker-compose.yml values
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
        const algorithm = configService.get<string>('JWT_ALGORITHM') || 'RS256';

        if (!publicKey) {
          throw new Error('환경 변수에 JWT_PUBLIC_KEY가 정의되어 있지 않습니다 (gateway-server).');
        }
        return {
          publicKey: publicKey.replace(/\\\\n/g, '\\n'),
          verifyOptions: {
            algorithms: [algorithm as any],
          },
        };
      },
      inject: [ConfigService],
    }),
    ProxyModule,
  ],
  controllers: [AppController], // ProxyController removed
  providers: [AppService, JwtStrategy], // Add JwtStrategy to providers
})
export class AppModule {}
