import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    ConfigModule, // Assuming ConfigModule is global or imported elsewhere if needed by JwtStrategy
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
        const algorithm = configService.get<string>('JWT_ALGORITHM') || 'RS256';

        if (!publicKey) {
          throw new Error('event-server AuthModule의 환경 변수에 JWT_PUBLIC_KEY가 정의되지 않았습니다.');
        }
        return {
          publicKey: publicKey.replace(/\\n/g, '\n'),
          verifyOptions: {
            algorithms: [algorithm as any],
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy],
  exports: [PassportModule, JwtModule], // Export if other modules in event-server need them
})
export class AuthModule {} 