import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// Define Role enum if not already globally available or imported from a shared location
// For now, let's assume Role might be defined elsewhere or simply string if not strictly typed here
// export enum Role { USER = 'USER', OPERATOR = 'OPERATOR', ADMIN = 'ADMIN', AUDITOR = 'AUDITOR'}

export interface JwtPayload {
  sub: string; 
  username: string;
  role: string; // Using string for simplicity if Role enum is an issue here
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') { 
  constructor(private configService: ConfigService) {
    const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
    const algorithm = configService.get<string>('JWT_ALGORITHM') || 'RS256';

    if (!publicKey) {
      throw new InternalServerErrorException('event-server JwtStrategy 환경 변수에서 JWT_PUBLIC_KEY를 찾을 수 없습니다.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey.replace(/\\n/g, '\n'), // Use public key for verification
      algorithms: [algorithm as any], // Specify the algorithm
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    if (!payload || !payload.sub || !payload.username || !payload.role) {
      throw new UnauthorizedException('event-server에서 토큰 페이로드가 유효하지 않습니다.');
    }
    // Return the user object that NestJS will attach to the Request object
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
} 