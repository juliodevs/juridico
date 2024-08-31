import { Request, Response } from 'express';
import connection from '../db/connection';

// Obtener ciudades por nombre y departamento
export const obtenerCiudades = (req: Request, res: Response) => {
    const { query, departamentoId } = req.query;
    const sqlQuery = query 
        ? 'SELECT * FROM ciudades WHERE nombre LIKE ? AND departamento_id = ?' 
        : 'SELECT * FROM ciudades WHERE departamento_id = ?';
    const values = query ? [`%${query}%`, departamentoId] : [departamentoId];
    
    connection.query(sqlQuery, values, (err, results) => {
        if (err) {
            console.error('Error al obtener ciudades:', err);
            return res.status(500).json({ error: 'Error al obtener ciudades' });
        }
        res.status(200).json(results);
    });
};
