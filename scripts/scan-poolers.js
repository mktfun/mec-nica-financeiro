import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || 'cnwzsvowkfymtdiryhqc';

const regions = [
  'sa-east-1',
  'us-east-1',
  'us-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ca-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'sa-east-1'
];

async function scanPoolers() {
  for (const r of regions) {
    const host = `aws-0-${r}.pooler.supabase.com`;
    const client = new pg.Client({
      host,
      port: 6543,
      database: 'postgres',
      user: `postgres.${projectRef}`,
      password: serviceKey,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 2000
    });

    try {
      await client.connect();
      console.log(`FOUND POOLER! Region: ${r}, host: ${host}`);
      const res = await client.query('SELECT current_database(), current_user;');
      console.log('Result:', res.rows);
      await client.end();
      return host;
    } catch (err) {
      if (!err.message.includes('ENOTFOUND')) {
        console.log(`Host ${host} response:`, err.message);
      }
    }
  }
  console.log('Finished scanning regions.');
}

scanPoolers();
