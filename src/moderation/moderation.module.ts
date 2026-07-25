import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { Block, BlockSchema } from './schemas/block.schema';
import { Report, ReportSchema } from './schemas/report.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: Block.name, schema: BlockSchema },
    ]),
  ],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
