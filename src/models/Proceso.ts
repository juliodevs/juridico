/**
 * Interfaz de dominio para la entidad Proceso.
 */
export type EstadoProceso = 'activo' | 'cerrado' | 'suspendido';

export interface Proceso {
    idproceso?: number;
    sujetosProcesales: string;
    radicado: string;
    juzgado: string;
    idCliente: number;
    fecha_audiencia?: Date | null;
    estado?: EstadoProceso;
    notificado?: boolean;
    created_at?: Date;
    updated_at?: Date;
}
