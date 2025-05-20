import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus, Put, UnauthorizedException, Param, Request } from '@nestjs/common';
import { AuthService, PlainUser } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { HeaderAuthGuard } from './guards/header-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from './roles.enum';
import { UsersService } from '../users/users.service';
import { User } from './decorators/user.decorator';
import { AuthenticatedUser } from './guards/header-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return this.authService.login(user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: { username: string; password: string }) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<{ access_token: string, refresh_token: string }> {
    try {
      return await this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
    } catch (error) {
      throw new UnauthorizedException(error.message || '유효하지 않은 갱신 토큰입니다');
    }
  }

  @UseGuards(HeaderAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@User() user: AuthenticatedUser, @Body() refreshTokenDto: RefreshTokenDto): Promise<{ message: string }> {
    try {
      if (refreshTokenDto && refreshTokenDto.refreshToken) {
         await this.authService.revokeRefreshToken(refreshTokenDto.refreshToken);
      }
      await this.authService.revokeAllRefreshTokensForUser(user.userId);
      return { message: '로그아웃이 성공적으로 완료되었습니다. 본 사용자의 모든 활성 갱신 토큰이 비활성화 되었습니다.' };
    } catch (error) {
      console.error('로그아웃 중 토큰 취소 오류:', error);
      return { message: '로그아웃이 처리되었습니다. 토큰 취소 중 문제가 발생했을 수 있습니다.' };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(HeaderAuthGuard)
  @Put('profile')
  async updateProfile(@User() user: AuthenticatedUser, @Body() updateUserDto: Partial<CreateUserDto>) {
    return { message: '프로필 업데이트 Endpoint', userId: user.userId, updates: updateUserDto };
  }

  @UseGuards(HeaderAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('users')
  async listUsers(@User() user: AuthenticatedUser) {
    return { message: '모든 사용자 목록 (관리자 전용)', requestedBy: user };
  }

  @UseGuards(HeaderAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('users/:id')
  async getUserById(@Param('id') id: string, @User() user: AuthenticatedUser) {
    return { message: `ID: ${id}인 사용자 정보 (관리자 전용)`, requestedByUserId: user.userId };
  }

  @UseGuards(HeaderAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body() body: { role: Role }, @User() user: AuthenticatedUser) {
    return { message: `사용자 역할 업데이트 (관리자 전용) - ID: ${id}, 역할: ${body.role}`, updatedByUserId: user.userId };
  }
}
