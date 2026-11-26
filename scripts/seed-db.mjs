import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

const database = process.env.POSTGRES_DB;
const password = process.env.POSTGRES_PASSWORD;

if (!database || password === undefined) {
    console.error('Define POSTGRES_DB y POSTGRES_PASSWORD en .env antes de cargar los datos.');
    process.exitCode = 1;
} else {
    const client = new Client({
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.POSTGRES_PORT ?? 5432),
        user: process.env.POSTGRES_USER ?? 'postgres',
        password,
        database,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });

    try {
        await client.connect();
        // La transacción del SQL evita dejar datos a medias cuando ocurre un error.
        await client.query(await readFile(new URL('../db/seed.sql', import.meta.url), 'utf8'));
        console.log('Datos iniciales cargados correctamente.');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error de base de datos desconocido';
        console.error(`Falló la carga inicial: ${message}`);
        process.exitCode = 1;
    } finally {
        await client.end().catch(() => undefined);
    }
}