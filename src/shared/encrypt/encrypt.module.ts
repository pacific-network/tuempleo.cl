import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptService } from './encrypt.service';

@Module({
    imports: [ConfigModule],
    providers: [EncryptService],
    exports: [EncryptService],
})
export class EncryptModule { }