import dotenv from 'dotenv';
dotenv.config();

console.log('Env keys:', Object.keys(process.env).filter(k => !k.startsWith('npm_') && !k.startsWith('VSCODE_') && !k.startsWith('Program')));
