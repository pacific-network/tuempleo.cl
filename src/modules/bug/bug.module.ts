import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bug } from 'src/repository/bug/bug.entity';
import { BugController } from './bug.controller';
import { BugService } from './bug.service';
import { MailerModule } from '../mailer/mailer.module';

@Module({
    imports: [TypeOrmModule.forFeature([Bug]), MailerModule],
    controllers: [BugController],
    providers: [BugService],
    exports: [BugService],
})
export class BugModule { }
