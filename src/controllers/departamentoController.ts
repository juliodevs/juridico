import { Request, Response } from 'express';
import connection from '../db/connection';

// Obtener todos los departamentos
export const obtenerDepartamentos = (req: Request, res: Response) => {
    const { query } = req.query;
    const sqlQuery = query 
        ? 'SELECT * FROM departamentos WHERE nombre LIKE ?' 
        : 'SELECT * FROM departamentos';
    const values = query ? [`%${query}%`] : [];
    
    connection.query(sqlQuery, values, (err, results) => {
        if (err) {
            console.error('Error al obtener departamentos:', err);
            return res.status(500).json({ error: 'Error al obtener departamentos' });
        }
        res.status(200).json(results);
    });
};

// Obtener todas las ciudades por departamento
export const obtenerCiudadesPorDepartamento = (req: Request, res: Response) => {
    const { departamentoId } = req.params;
    
    const query = 'SELECT * FROM ciudades WHERE departamento_id = ?';
    connection.query(query, [departamentoId], (err, results) => {
        if (err) {
            console.error('Error al obtener ciudades:', err);
            return res.status(500).json({ error: 'Error al obtener ciudades' });
        }
        res.status(200).json(results);
    });
};
