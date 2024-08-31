import { Request, Response } from 'express';
import connection from '../db/connection';

// Función para guardar un cliente
export const guardarCliente = (req: Request, res: Response) => {
    const { numero_documento, nombre, apellidos, telefono, direccion, ciudad } = req.body;
    const query = 'INSERT INTO clientes (numero_documento, nombre, apellidos, telefono, direccion, ciudad) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(query, [numero_documento, nombre, apellidos, telefono, direccion, ciudad], (err, results) => {
        if (err) {
            console.error('Error al insertar el cliente:', err);
            return res.status(500).json({ error: 'Error al insertar el cliente' });
        }
        res.status(200).json({ message: 'Cliente guardado exitosamente' });
    });
};

// Función para obtener todos los clientes
export const obtenerClientes = (req: Request, res: Response) => {
    const query = 'SELECT * FROM clientes';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener los clientes:', err);
            return res.status(500).json({ error: 'Error al obtener los clientes' });
        }
        res.status(200).json(results);
    });
};
