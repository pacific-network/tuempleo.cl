import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';
import { BugStatus } from 'src/repository/bug/bug.entity';

export class UpdateBugStatusDto {
    @ApiProperty({
        enum: ['abierto', 'en_revision', 'resuelto', 'no_se_corrige'],
        example: 'en_revision',
    })
    @IsNotEmpty()
    @IsIn(['abierto', 'en_revision', 'resuelto', 'no_se_corrige'])
    status: BugStatus;
}
