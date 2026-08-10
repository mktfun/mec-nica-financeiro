const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  // Verifica os logs do PM2 para o bot
  const cmd = `pm2 logs --lines 50 --nostream`; 
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      console.log(output);
      conn.end();
      process.exit(code);
    }).on('data', (data) => {
      output += data;
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '100.126.50.101',
  port: 22,
  username: 'operacional',
  password: 'Mktfunil85633*'
});
