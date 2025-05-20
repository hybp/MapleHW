import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
    const algorithm = configService.get<string>('JWT_ALGORITHM') || 'RS256';

    if (!publicKey) {
      throw new Error('JWT_SECRET이 정의되어 있지 않습니다.');
    }
    
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey.replace(/\\\\n/g, '\\n'),
      algorithms: [algorithm as any],
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.username || !payload.role) {
      throw new UnauthorizedException('유효하지 않은 토큰 페이로드입니다.');
    }
    
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
} 