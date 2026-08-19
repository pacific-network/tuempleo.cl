import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AcceptConsentDto {
  @IsString()
  @IsIn(['terms', 'privacy'])
  documentType: 'terms' | 'privacy';

  @IsString()
  @IsNotEmpty()
  documentVersion: string;

  /**
   * Opcional: el diálogo de renovación del frontend solo se cierra aceptando, así
   * que no envía el campo. Se mantiene expuesto para poder registrar un rechazo
   * explícito, que la ley exige poder acreditar igual que la aceptación.
   */
  @IsOptional()
  @IsBoolean()
  accepted?: boolean = true;
}
