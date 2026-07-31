const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('ls -la /opt/tork-stack/', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => { conn.end(); process.exit(code); })
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '100.126.50.101', port: 22, username: 'operacional', password: 'Mktfunil8563*' });
