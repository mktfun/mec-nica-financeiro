const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
let htmlData = '';

conn.on('ready', () => {
  const script = `
    cd /opt/conciliamec-bot
    git pull
    docker cp bot/src conciliamec-bot:/app/
    docker exec conciliamec-bot sed -i '/dotenv.config/d' src/tests/test-os-query.ts
    docker exec conciliamec-bot npx tsx src/tests/test-os-query.ts
    docker cp conciliamec-bot:/app/src/tests/oi-os-result.html .
    cat oi-os-result.html
  `;
  
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      fs.writeFileSync(path.join(__dirname, 'bot/src/tests/oi-os-result.html'), htmlData);
      console.log('HTML saved locally.');
      conn.end();
    }).on('data', (data) => {
      htmlData += data.toString();
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '100.126.50.101',
  port: 22,
  username: 'operacional',
  password: 'Mktfunil8563*'
});
