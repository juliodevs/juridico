/**
 * Interfaz de dominio para la entidad Cliente.
 */
export interface Cliente {
    id?: number;
    numero_documento: string;
    nombre: string;
    apellidos: string;
    telefono: string;
    direccion?: string;
    ciudad?: string;
    email?: string;
    radicado?: string;
    created_at?: Date;
    updated_at?: Date;
}
