import { Module } from '@nestjs/common';
import { GlobalVarsController } from './global-vars.controller';
import { GlobalVarsService } from './global-vars.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GlobalVarsController],
  providers: [GlobalVarsService],
  exports: [GlobalVarsService],
})
export class GlobalVarsModule {}
