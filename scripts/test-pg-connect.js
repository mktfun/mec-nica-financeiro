import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || 'cnwzsvowkfymtdiryhqc';

async function testConnection() {
  const hosts = [
    'aws-0-sa-east-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com'
  ];

  for (const host of hosts) {
    console.log(`Testing host ${host} with user postgres.${projectRef}...`);
    const client = new pg.Client({
      host,
      port: 6543,
      database: 'postgres',
      user: `postgres.${projectRef}`,
      password: serviceKey,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`SUCCESS connected to ${host}!`);
      const res = await client.query('SELECT current_database(), current_user;');
      console.log('QueryResult:', res.rows);
      await client.end();
      return client;
    } catch (err) {
      console.log(`Failed connecting to ${host}:`, err.message);
    }
  }
}

testConnection();
