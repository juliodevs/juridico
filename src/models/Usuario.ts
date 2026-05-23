/**
 * Interfaz de dominio para la entidad Usuario.
 */
export type RolUsuario = 'admin' | 'abogado';

export interface Usuario {
    id?: number;
    nombre: string;
    email: string;
    password_hash?: string;
    rol: RolUsuario;
    activo?: boolean;
    created_at?: Date;
}

/**
 * Payload del JWT — lo que se almacena en el token.
 */
export interface JwtPayload {
    id: number;
    email: string;
    rol: RolUsuario;
}
