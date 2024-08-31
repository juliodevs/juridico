import { Request, Response } from 'express';
import connection from '../db/connection';

// Guardar un nuevo juzgado
export const guardarJuzgado = (req: Request, res: Response) => {
    const { juzgado, juez, email, direccion, telefono, departamento, ciudad } = req.body;
    const query = 'INSERT INTO juzgados (juzgado, juez, email, direccion, telefono, departamento_id, ciudad_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
    connection.query(query, [juzgado, juez, email, direccion, telefono, departamento, ciudad], (err, results) => {
        if (err) {
            console.error('Error al insertar el juzgado:', err);
            return res.status(500).json({ error: 'Error al insertar el juzgado' });
        }
        res.status(200).json({ message: 'Juzgado guardado exitosamente' });
    });
};

// Obtener todos los juzgados
export const obtenerJuzgados = (req: Request, res: Response) => {
    const query = `
        SELECT j.*, d.nombre AS departamento, c.nombre AS ciudad
        FROM juzgados j
        JOIN departamentos d ON j.departamento_id = d.id
        JOIN ciudades c ON j.ciudad_id = c.id
    `;
    connection.query(query, (err, results: any[]) => {
        if (err) {
            console.error('Error al obtener los juzgados:', err);
            return res.status(500).json({ error: 'Error al obtener los juzgados' });
        }
        res.status(200).json(results);
    });
};

// Obtener un juzgado por ID
export const obtenerJuzgadoPorId = (req: Request, res: Response) => {
    const { id } = req.params;
    const query = `
        SELECT j.juzgado, j.juez, j.email, j.direccion, j.telefono, d.nombre AS departamento, c.nombre AS ciudad
        FROM juzgados j
        JOIN departamentos d ON j.departamento_id = d.id
        JOIN ciudades c ON j.ciudad_id = c.id
        WHERE j.id = ?
    `;
    connection.query(query, [id], (err, results: any[]) => {
        if (err) {
            console.error('Error al obtener el juzgado:', err);
            return res.status(500).json({ error: 'Error al obtener el juzgado' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Juzgado no encontrado' });
        }
        res.status(200).json(results[0]);
    });
};