import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;

async function setup() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
    };

    const targetDb = process.env.DB_NAME || 'sales_db';

    // 1. Connect to 'postgres' database to create the target database
    console.log(`Connecting to PostgreSQL to check/create database "${targetDb}"...`);
    const client = new Client({ ...config, database: 'postgres' });

    try {
        await client.connect();

        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDb]);

        if (res.rowCount === 0) {
            console.log(`Database "${targetDb}" does not exist. Creating...`);
            await client.query(`CREATE DATABASE ${targetDb}`);
            console.log(`Database "${targetDb}" created successfully.`);
        } else {
            console.log(`Database "${targetDb}" already exists.`);
        }
    } catch (err) {
        console.error('Error during database creation phase:', err);
        process.exit(1);
    } finally {
        await client.end();
    }

    // 2. Connect to the new database to run the schema
    console.log(`Connecting to "${targetDb}" to run schema...`);
    const dbClient = new Client({ ...config, database: targetDb });

    try {
        await dbClient.connect();
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema...');
        await dbClient.query(schema);
        console.log('Schema applied successfully.');

    } catch (err) {
        console.error('Error during schema application phase:', err);
    } finally {
        await dbClient.end();
    }
}

setup();
