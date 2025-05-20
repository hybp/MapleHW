import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from './roles.enum';

export interface JwtPayload {
  sub: string; 
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') { 
  constructor(private configService: ConfigService) {
    const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
    const algorithm = configService.get<string>('JWT_ALGORITHM') || 'RS256';

    if (!publicKey) {
      throw new InternalServerErrorException('환경 변수에 JWT_PUBLIC_KEY가 정의되어 있지 않습니다 (gateway-server JwtStrategy).');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey.replace(/\\\\n/g, '\\n'),
      algorithms: [algorithm as any],
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    if (!payload || !payload.sub || !payload.username || !payload.role) {
      throw new UnauthorizedException('유효하지 않은 토큰 페이로드입니다 (gateway-server).');
    }
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
} 
 
 