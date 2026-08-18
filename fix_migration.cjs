const fs = require('fs');
const file = 'supabase/migrations/20260807000000_global_math_and_logs.sql';
let buffer = fs.readFileSync(file);
let text = buffer.toString('latin1');
text = text.replace(/CREATE TRIGGER\s+(\w+)\s+(BEFORE|AFTER)\s+(UPDATE|INSERT|DELETE)\s+ON\s+(\w+)/gi, 'DROP TRIGGER IF EXISTS $1 ON $4;\nCREATE TRIGGER $1 $2 $3 ON $4');
fs.writeFileSync(file, text, 'latin1');
console.log('Fixed triggers');
