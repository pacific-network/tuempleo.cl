import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SiiService {
    private readonly baseUrl = 'https://legacy.apigateway.cl/api/v1/sii/contribuyentes';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) { }

    async consultarSituacionTributaria(rut: string): Promise<any> {
        const token = this.configService.get<string>('API_GATEWAY_TOKEN'); // desde .env

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
            console.error('Error al consultar API Gateway:', error?.response?.data || error.message);
            throw new HttpException(
                'Error al consultar situación tributaria',
                error?.response?.status || HttpStatus.BAD_GATEWAY,
            );
        }
    }
}
