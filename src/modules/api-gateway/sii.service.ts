import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { SiiScraperService } from './sii-scraper.service';

@Injectable()
export class SiiService {
    private readonly logger = new Logger(SiiService.name);
    private readonly baseUrl = 'https://legacy.apigateway.cl/api/v1/sii/contribuyentes';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly siiScraperService: SiiScraperService,
    ) { }

    async consultarSituacionTributaria(rut: string): Promise<any> {
        const token = this.configService.get<string>('API_GATEWAY_TOKEN'); // desde .env

        if (!token) {
            this.logger.warn('API_GATEWAY_TOKEN no configurado, usando scraper del SII');
            return this.consultarConScraper(rut);
        }

        const url = `${this.baseUrl}/situacion_tributaria/tercero/${rut}`;

        try {
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                }),
            );
            return { ...response.data, fuente: 'apigateway' };
        } catch (error) {
            this.logger.error(
                `Error al consultar API Gateway: ${JSON.stringify(error?.response?.data ?? error.message)}`,
            );
            return this.consultarConScraper(rut);
        }
    }

    private async consultarConScraper(rut: string): Promise<any> {
        try {
            return await this.siiScraperService.consultarSituacionTributaria(rut);
        } catch (error) {
            // RUT inválido es error del cliente, no del fallback: se propaga tal cual.
            if (error instanceof HttpException && error.getStatus() === HttpStatus.BAD_REQUEST) {
                throw error;
            }
            this.logger.error(`Fallback scraper SII falló: ${error?.message ?? error}`);
            throw new HttpException(
                'Error al consultar situación tributaria',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }
}
