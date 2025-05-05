import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

@Injectable()
export class EncryptService {
    private readonly secret: string;
    private readonly algorithm = 'aes-256-ctr';


    constructor(private readonly configService: ConfigService) {
        this.secret = this.configService.get<string>('JWT_SECRET') || '';
        if (!this.secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
    }

    // Genera la clave (Key) usando JWT_SECRET
    private getKey(): Buffer {
        return createHash('sha256')
            .update(this.secret)
            .digest();
    }

    // Encrypts a string using AES-256-CTR algorithm

    public encrypt(data: string): string {
        const iv = randomBytes(16); // Vector de inicialización aleatorio
        const key = this.getKey();
        const cipher = createCipheriv(this.algorithm, key, iv);
        const encrypted = Buffer.concat([cipher.update(data, 'utf-8'), cipher.final()]);

        // Combina IV con el texto encriptado
        return Buffer.concat([iv, encrypted]).toString('base64');
    }

    // Método para desencriptar texto
    public decrypt(encryptedText: string): string {
        const data = Buffer.from(encryptedText, 'base64');
        const iv = data.slice(0, 16); // Extrae el IV (primeros 16 bytes)
        const encryptedData = data.slice(16); // Extrae el texto encriptado
        const key = this.getKey();
        const decipher = createDecipheriv(this.algorithm, key, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

        return decrypted.toString('utf-8');
    }

}

