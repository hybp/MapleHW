import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const privateKey = configService.get<string>('JWT_PRIVATE_KEY');
        const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
        const expiresIn = configService.get<string>('JWT_EXPIRATION') || '1h'; // Default if not set
        const algorithm = configService.get<string>('JWT_ALGORITHM') || 'RS256';

        if (!privateKey || !publicKey) {
          throw new Error('환경 변수에 JWT_PRIVATE_KEY 또는 JWT_PUBLIC_KEY가 정의되어 있지 않습니다.');
        }

        return {
          privateKey: privateKey.replace(/\\\\n/g, '\\n'), // Handle escaped newlines if keys are in .env
          publicKey: publicKey.replace(/\\\\n/g, '\\n'),   // Handle escaped newlines
          signOptions: { 
            expiresIn: expiresIn,
            algorithm: algorithm as any, // Use 'as any' for algorithm type if 'RS256' etc. string causes issues
          },
          // verifyOptions can also be set here if needed, e.g. algorithms: [algorithm]
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
