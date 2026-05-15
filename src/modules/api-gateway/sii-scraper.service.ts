import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SiiActividadEconomica {
    giro: string;
    codigo: number | null;
    categoria: string | null;
    afecta_iva: boolean | null;
    fecha: string | null;
}

export interface SiiSituacionTributaria {
    rut: string;
    razon_social: string;
    actividades_economicas: SiiActividadEconomica[];
    inicio_actividades: boolean;
    fecha_inicio_actividades: string | null;
    domicilios: string[];
    empresa_menor_tamano: boolean;
    condicion_fiscal: string;
    fuente: 'scraper';
}

@Injectable()
export class SiiScraperService {
    private readonly logger = new Logger(SiiScraperService.name);
    private readonly stcUrl = 'https://zeus.sii.cl/cvc_cgi/stc/getstc';
    private readonly captchaUrl = 'https://zeus.sii.cl/cvc_cgi/stc/CViewCaptcha.cgi';
    private readonly userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    constructor(private readonly httpService: HttpService) { }

    async consultarSituacionTributaria(rutInput: string): Promise<SiiSituacionTributaria> {
        const { numero, dv } = this.parseRut(rutInput);
        const { txtCaptcha, code } = await this.solveCaptcha();
        const html = await this.fetchStc(numero, dv, txtCaptcha, code);

        if (this.requiresCaptcha(html)) {
            throw new HttpException(
                'SII_CAPTCHA_REJECTED',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        return this.parseHtml(html, `${numero}-${dv}`);
    }

    private async solveCaptcha(): Promise<{ txtCaptcha: string; code: string }> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(this.captchaUrl, 'oper=0', {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': this.userAgent,
                    },
                    timeout: 10000,
                }),
            );
            const body = response.data as { txtCaptcha?: string };
            const txtCaptcha = body?.txtCaptcha;
            if (!txtCaptcha) throw new Error('captcha payload vacío');
            const decoded = Buffer.from(txtCaptcha, 'base64').toString('utf-8');
            const code = decoded.substring(36, 40);
            if (!/^[A-Za-z0-9]{4}$/.test(code)) {
                throw new Error(`código captcha inesperado: "${code}"`);
            }
            return { txtCaptcha, code };
        } catch (error) {
            this.logger.error(`SII captcha fetch falló: ${error?.message ?? error}`);
            throw new HttpException(
                'No se pudo resolver el captcha del SII',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    private async fetchStc(
        numero: string,
        dv: string,
        txtCaptcha: string,
        code: string,
    ): Promise<string> {
        const form = new URLSearchParams({
            RUT: numero,
            DV: dv,
            PRG: 'STC',
            OPC: 'NOR',
            txt_code: code,
            txt_captcha: txtCaptcha,
        });

        try {
            const response = await firstValueFrom(
                this.httpService.post(this.stcUrl, form.toString(), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': this.userAgent,
                        Accept: 'text/html,application/xhtml+xml',
                        'Accept-Language': 'es-CL,es;q=0.9',
                    },
                    responseType: 'text',
                    timeout: 15000,
                }),
            );
            return response.data as string;
        } catch (error) {
            this.logger.error(`SII STC request falló: ${error?.message ?? error}`);
            throw new HttpException(
                'No se pudo contactar al servicio del SII',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    private parseRut(rut: string): { numero: string; dv: string } {
        const clean = rut.replace(/[.\s]/g, '').toUpperCase();
        const match = clean.match(/^(\d{1,8})-?([\dK])$/);
        if (!match) {
            throw new HttpException('RUT inválido', HttpStatus.BAD_REQUEST);
        }
        return { numero: match[1], dv: match[2] };
    }

    private requiresCaptcha(html: string): boolean {
        return /reingrese\s+captcha/i.test(html);
    }

    private parseHtml(html: string, rutFormatted: string): SiiSituacionTributaria {
        const plain = this.htmlToText(html);

        const razonSocial = this.matchOne(
            plain,
            /Nombre o Raz[oó]n Social\s*:\s+(.+?)\s+RUT Contribuyente/i,
        );

        const inicioActividades = /Inicio de Actividades:\s*S[IÍ]/i.test(plain);
        const fechaInicioRaw = this.matchOne(
            plain,
            /Fecha de Inicio de Actividades:\s*(\d{2}-\d{2}-\d{4})/i,
        );

        const empresaMenorTamano = /Empresa de Menor Tama[ñn]o[^:]*:\s*S[IÍ]/i.test(plain);

        const actividades = this.extractActividades(html);

        return {
            rut: rutFormatted,
            razon_social: razonSocial,
            actividades_economicas: actividades,
            inicio_actividades: inicioActividades,
            fecha_inicio_actividades: fechaInicioRaw
                ? this.normalizeDate(fechaInicioRaw)
                : null,
            domicilios: [],
            empresa_menor_tamano: empresaMenorTamano,
            condicion_fiscal: '',
            fuente: 'scraper',
        };
    }

    private htmlToText(html: string): string {
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<\/(tr|p|div|li)>/gi, ' | ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&oacute;/gi, 'ó')
            .replace(/&aacute;/gi, 'á')
            .replace(/&eacute;/gi, 'é')
            .replace(/&iacute;/gi, 'í')
            .replace(/&uacute;/gi, 'ú')
            .replace(/&ntilde;/gi, 'ñ')
            .replace(/&Ntilde;/gi, 'Ñ')
            .replace(/&[a-zA-Z]+;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private matchOne(text: string, regex: RegExp): string {
        const m = text.match(regex);
        if (!m) return '';
        return m[1]
            .replace(/\|/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    private normalizeDate(raw: string): string {
        const [d, m, y] = raw.split('-');
        return `${y}-${m}-${d}`;
    }

    private extractActividades(html: string): SiiActividadEconomica[] {
        const actividades: SiiActividadEconomica[] = [];
        const tableMatches = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) ?? [];

        for (const table of tableMatches) {
            const headerText = this.htmlToText(table.slice(0, 600)).toLowerCase();
            if (!headerText.includes('actividades') || !headerText.includes('categor')) continue;

            const rowMatches = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
            for (const row of rowMatches) {
                const cellMatches = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? [];
                const cells = cellMatches
                    .map((c) => this.htmlToText(c))
                    .filter((c) => c.length > 0);
                if (cells.length < 4) continue;

                const giro = cells[0];
                if (
                    !giro ||
                    /actividades?$/i.test(giro) ||
                    /c[oó]digo/i.test(giro)
                ) continue;

                const codigo = /^\d+$/.test(cells[1]) ? parseInt(cells[1], 10) : null;
                if (codigo === null) continue;

                const categoria = cells[2] ?? null;
                const afectaIvaCell = (cells[3] ?? '').toLowerCase();
                const afectaIva = afectaIvaCell.startsWith('s')
                    ? true
                    : afectaIvaCell.startsWith('n')
                        ? false
                        : null;
                const fechaMatch = (cells[4] ?? '').match(/(\d{2})-(\d{2})-(\d{4})/);

                actividades.push({
                    giro,
                    codigo,
                    categoria,
                    afecta_iva: afectaIva,
                    fecha: fechaMatch
                        ? `${fechaMatch[3]}-${fechaMatch[2]}-${fechaMatch[1]}`
                        : null,
                });
            }
        }

        return actividades;
    }
}
