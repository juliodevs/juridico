/**
 * Interfaz de dominio para la entidad Juzgado.
 */
export interface Juzgado {
    id?: number;
    juzgado: string;
    juez?: string;
    email?: string;
    direccion?: string;
    telefono?: string;
    departamento_id?: number;
    ciudad_id?: number;
    // Campos extendidos para joins
    departamento?: string;
    ciudad?: string;
}
