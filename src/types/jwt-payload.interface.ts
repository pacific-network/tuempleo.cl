export interface JwtPayload {
    sub: number; // o 'id', si así generas el token
    email: string;
    // puedes agregar otros campos según tu token
}