import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from './roles.enum';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';

// Represents the user object after removing password and Mongoose fields
export interface PlainUser {
  _id: Types.ObjectId | string;
  username: string;
  email: string;
  role: Role;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JwtPayload {
  username: string;
  sub: string; // User ID
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('잘못된 인증 정보입니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('잘못된 인증 정보입니다.');
    }

    const { password: _, ...result } = user.toObject();
    return result;
  }

  private async createRefreshToken(userId: Types.ObjectId | string): Promise<string> {
    const tokenString = randomBytes(64).toString('hex');
    const expiresInDays = parseInt(this.configService.get<string>('REFRESH_TOKEN_EXPIRATION_DAYS', '7'), 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.refreshTokenModel.create({
      userId: typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
      token: tokenString,
      expiresAt,
    });
    return tokenString;
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user._id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshAccessToken(refreshTokenString: string): Promise<{ access_token: string, refresh_token: string }> {
    const storedToken = await this.refreshTokenModel.findOne({ token: refreshTokenString });
    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      if (storedToken?.userId) {
        await this.revokeAllRefreshTokensForUser(storedToken.userId);
      }
      throw new UnauthorizedException('유효하지 않거나 만료된 갱신 토큰입니다.');
    }

    const user = await this.usersService.findOne(storedToken.userId.toString());
    if (!user) {
      await this.revokeAllRefreshTokensForUser(storedToken.userId);
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    await this.refreshTokenModel.updateOne(
      { _id: storedToken._id },
      { $set: { isRevoked: true } }
    );

    const userObj = user.toObject() as PlainUser;
    const payload: JwtPayload = { 
      username: userObj.username, 
      sub: userObj._id.toString(), 
      role: userObj.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: await this.createRefreshToken(userObj._id),
    };
  }

  async register(createUserDto: CreateUserDto): Promise<PlainUser> {
    try {
      const user = await this.usersService.create(createUserDto);
      const { password, __v, ...result } = user.toObject();
      return result as PlainUser;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('사용자 이름 또는 이메일이 이미 존재합니다.');
      }
      throw new BadRequestException('회원가입에 실패했습니다. 입력 정보를 확인해주세요.');
    }
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenModel.updateOne(
      { token },
      { $set: { isRevoked: true } }
    );
  }

  async revokeAllRefreshTokensForUser(userId: Types.ObjectId | string): Promise<void> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    await this.refreshTokenModel.updateMany(
      { userId: userObjectId, isRevoked: false },
      { $set: { isRevoked: true } }
    );
  }
  
  decodeAccessToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}
