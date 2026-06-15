// src/modules/auth/constants.ts

export const jwtConstants = {
    // Getter lazy: se evalúa en cada acceso (en tiempo de request), cuando las
    // variables de entorno ya fueron cargadas. Sin fallback inseguro.
    get secret(): string {
        const s = process.env.JWT_SECRET;
        if (!s || s.trim() === '') {
            throw new Error('Variable de entorno requerida no definida: JWT_SECRET');
        }
        return s;
    },
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '30d',
};