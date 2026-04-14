import { IsBoolean, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class AcceptConsentDto {
  @IsString()
  @IsIn(['terms', 'privacy'])
  document_type: 'terms' | 'privacy';

  @IsString()
  @IsNotEmpty()
  document_version: string;

  @IsBoolean()
  accepted: boolean;
}
