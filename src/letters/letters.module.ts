import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { LettersController } from './letters.controller';
import { LettersService } from './letters.service';
import { Letter, LetterSchema } from './schemas/letter.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Letter.name, schema: LetterSchema }]),
  ],
  controllers: [LettersController],
  providers: [LettersService],
})
export class LettersModule {}
