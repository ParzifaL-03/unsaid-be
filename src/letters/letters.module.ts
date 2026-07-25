import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LettersController } from './letters.controller';
import { LettersService } from './letters.service';

@Module({
  imports: [AuthModule],
  controllers: [LettersController],
  providers: [LettersService],
})
export class LettersModule {}
