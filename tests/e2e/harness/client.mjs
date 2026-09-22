// tests/e2e/harness/client.mjs
import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment
dotenv.config();

export const projectRef = process.env.SUPABASE_PROJECT_ID || 'cnwzsvowkfymtdiryhqc';
export const supabaseUrl = process.env.SUPABASE_URL || `https://${projectRef}.supabase.co`;
export const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
export const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
export const accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabaseAnon = createClient(supabaseUrl, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Execute raw SQL via Supabase Management API
 */
export function querySql(sql) {
  return new Promise((resolve, reject) => {
    if (!accessToken) {
      resolve({ status: 500, error: 'SUPABASE_ACCESS_TOKEN not set in environment', rows: [] });
      return;
    }
    const cleanSql = sql.replace(/^\uFEFF/, '').trim();
    const body = JSON.stringify({ query: cleanSql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, rows: Array.isArray(parsed) ? parsed : [] });
        } catch {
          resolve({ status: res.statusCode, raw: data, rows: [] });
        }
      });
    });
    req.on('error', (err) => resolve({ status: 500, error: err.message, rows: [] }));
    req.write(body);
    req.end();
  });
}

/**
 * Invokes get_daily_reconciliation_summary RPC
 */
export async function getDailyReconciliationSummary(date, forceDynamic = false) {
  return await supabase.rpc('get_daily_reconciliation_summary', {
    p_date: date,
    p_force_dynamic: forceDynamic,
  });
}

/**
 * Invokes fechar_dia RPC
 */
export async function fecharDia(date, forceReopen = false) {
  return await supabase.rpc('fechar_dia', {
    p_date: date,
    p_force_reopen: forceReopen,
  });
}

/**
 * Check if a PostgreSQL function exists in pg_proc
 */
export async function checkFunctionExists(functionName) {
  const res = await querySql(`
    SELECT proname, proargnames, prorettype::regtype::text as return_type
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND proname = '${functionName}';
  `);
  return {
    exists: (res.rows || []).length > 0,
    overloads: res.rows || [],
  };
}

/**
 * Check if a table or view exists
 */
export async function checkRelationType(relationName) {
  const res = await querySql(`
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '${relationName}';
  `);
  if (!res.rows || res.rows.length === 0) return { exists: false, type: null };
  return { exists: true, type: res.rows[0].table_type };
}

/**
 * Recursively search directory for code patterns (static analysis)
 */
export function scanCodebase(dir, fileExtension = /\.(ts|tsx|js|jsx)$/, excludeDirs = ['node_modules', '.git', 'dist', '.agents']) {
  const results = [];
  function traverse(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (entry.isFile() && fileExtension.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }
  traverse(dir);
  return results;
}

/**
 * Search file contents for matches of a regex
 */
export function findPatternInFiles(files, regex) {
  const matches = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (regex.test(line)) {
        matches.push({ file, line: index + 1, content: line.trim() });
      }
    });
  }
  return matches;
}
