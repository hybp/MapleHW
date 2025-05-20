import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema'; // Path to your schema
// Remove UsersController if you plan to handle user routes via AuthController or a dedicated UsersController later
// import { UsersController } from './users.controller'; 

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService] // Export UsersService so it can be used in other modules (e.g., AuthModule)
})
export class UsersModule {}
