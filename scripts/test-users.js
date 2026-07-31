import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || 'cnwzsvowkfymtdiryhqc';

async function testUserCombinations() {
  const users = [
    `postgres.${projectRef}`,
    `service_role.${projectRef}`,
    `anon.${projectRef}`,
    'postgres',
    'service_role'
  ];

  const hosts = [
    'aws-0-sa-east-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com'
  ];

  for (const host of hosts) {
    for (const user of users) {
      const client = new pg.Client({
        host,
        port: 6543,
        database: 'postgres',
        user,
        password: serviceKey,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 2000
      });

      try {
        await client.connect();
        console.log(`SUCCESS! Host: ${host}, User: ${user}`);
        await client.end();
        return;
      } catch (err) {
        if (!err.message.includes('ENOTFOUND') && !err.message.includes('Tenant or user not found')) {
          console.log(`Host ${host}, User ${user} ->`, err.message);
        }
      }
    }
  }
}

testUserCombinations();
