/**
 * Tests de contrato del módulo legal.
 *
 * El valor de este archivo está en el `ValidationPipe` real: los bugs que motivaron
 * estos tests eran payloads que el frontend enviaba y el backend rechazaba con 400,
 * y ningún test de service los habría visto porque el service nunca llegaba a
 * ejecutarse. Los payloads de más abajo son literalmente los que arma
 * `front-v2-tuempleo/frontend/src/services/LegalService.ts`.
 */
import { ValidationPipe, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { AcceptConsentDto } from './dto/accept-consent.dto';
import { DeleteAccountDto, CONFIRM_PHRASE } from './dto/delete-account.dto';

/** Réplica del pipe global de `main.ts:72`. */
const pipe = new ValidationPipe({ transform: true, whitelist: true });

const meta = (metatype: any): ArgumentMetadata => ({
  type: 'body',
  metatype,
  data: '',
});

describe('Contratos del módulo legal', () => {
  describe('AcceptConsentDto — POST /v1/legal/consent', () => {
    it('acepta el payload que envía el frontend', async () => {
      const payload = { documentType: 'terms', documentVersion: '2.0' };

      const result = await pipe.transform(payload, meta(AcceptConsentDto));

      expect(result.documentType).toBe('terms');
      expect(result.documentVersion).toBe('2.0');
    });

    it('asume aceptación cuando el frontend no manda `accepted`', async () => {
      // El diálogo de renovación solo se cierra aceptando, así que no envía el campo.
      const result = await pipe.transform(
        { documentType: 'privacy', documentVersion: '2.0' },
        meta(AcceptConsentDto),
      );

      expect(result.accepted).toBe(true);
    });

    it('permite registrar un rechazo explícito', async () => {
      const result = await pipe.transform(
        { documentType: 'privacy', documentVersion: '2.0', accepted: false },
        meta(AcceptConsentDto),
      );

      expect(result.accepted).toBe(false);
    });

    it('rechaza un tipo de documento desconocido', async () => {
      await expect(
        pipe.transform(
          { documentType: 'cookies', documentVersion: '2.0' },
          meta(AcceptConsentDto),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza una versión vacía', async () => {
      await expect(
        pipe.transform(
          { documentType: 'terms', documentVersion: '' },
          meta(AcceptConsentDto),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('DeleteAccountDto — DELETE /v1/legal/account', () => {
    it('acepta el payload que envía el frontend', async () => {
      const payload = { password: 'micontrasena', confirmPhrase: CONFIRM_PHRASE };

      const result = await pipe.transform(payload, meta(DeleteAccountDto));

      expect(result.password).toBe('micontrasena');
      expect(result.confirmPhrase).toBe(CONFIRM_PHRASE);
    });

    it('acepta la solicitud sin contraseña (cuentas OAuth)', async () => {
      const result = await pipe.transform(
        { confirmPhrase: CONFIRM_PHRASE },
        meta(DeleteAccountDto),
      );

      expect(result.password).toBeUndefined();
      expect(result.confirmPhrase).toBe(CONFIRM_PHRASE);
    });

    it('rechaza una frase de confirmación que no calza exactamente', async () => {
      await expect(
        pipe.transform(
          { password: 'x', confirmPhrase: 'eliminar mi cuenta' },
          meta(DeleteAccountDto),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza la solicitud sin frase de confirmación', async () => {
      await expect(
        pipe.transform({ password: 'x' }, meta(DeleteAccountDto)),
      ).rejects.toThrow(BadRequestException);
    });

    it('descarta campos no declarados en vez de confiar en ellos', async () => {
      const result: any = await pipe.transform(
        { confirmPhrase: CONFIRM_PHRASE, usuario_id: 999, isAdmin: true },
        meta(DeleteAccountDto),
      );

      expect(result.usuario_id).toBeUndefined();
      expect(result.isAdmin).toBeUndefined();
    });
  });
});
