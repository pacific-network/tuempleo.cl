import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateBugNotesDto {
    @ApiProperty({
        example: 'Reproducido en Chrome 120 + macOS. Investigando el upload handler.',
        nullable: true,
    })
    @IsOptional()
    @IsString()
    notasInternas: string | null;
}
