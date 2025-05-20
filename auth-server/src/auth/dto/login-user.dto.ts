import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class LoginUserDto {
  @IsString()
  @IsNotEmpty()
  username: string; // Or could be email, depending on login preference

  @IsString()
  @MinLength(8)
  password: string;
} 
 
 