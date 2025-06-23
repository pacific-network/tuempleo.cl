import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import fetch from "node-fetch";

@Injectable()
export class GetRutService {
    async fetchRutData(rut: string): Promise<any> {
        try {
            const response = await fetch(`https://rut.simpleapi.cl/${rut}`, {
                headers: {
                    'Authorization': '6097-R860-6391-9981-7515',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorBody: any | Record<string, any> = await response.json();
                throw new HttpException(errorBody, response.status);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error al consultar simpleapi:', error);
            throw new HttpException('Error interno al consultar el RUT', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}