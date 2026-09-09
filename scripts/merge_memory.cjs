const fs = require('fs');
const path = require('path');

function mergeMemory(roundDir, memoryFile = '.council/shared_memory.json') {
  let memory = { topic: 'TBD', rounds: [] };
  if (fs.existsSync(memoryFile)) {
    try {
      let raw = fs.readFileSync(memoryFile, 'utf8');
      raw = raw.replace(/^\uFEFF/, '').trim();
      if (raw) {
        memory = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading memory file, recreating:', e);
    }
  }

  const roundNumber = (memory.rounds ? memory.rounds.length : 0) + 1;
  const roundData = { round: roundNumber, messages: [] };

  if (fs.existsSync(roundDir)) {
    const files = fs.readdirSync(roundDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const agentName = path.basename(file).split('_')[0];
      let content = fs.readFileSync(path.join(roundDir, file), 'utf8');
      content = content.replace(/^\uFEFF/, '').trim();
      roundData.messages.push({
        agent: agentName,
        content: content
      });
    }
  }

  if (!memory.rounds) memory.rounds = [];
  memory.rounds.push(roundData);

  const dir = path.dirname(memoryFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2), 'utf8');
  console.log(`Memory merged successfully for Round ${roundNumber} from ${roundDir}`);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node merge_memory.cjs <round_dir> [memory_file]');
  process.exit(1);
}

const roundDir = args[0];
const memFile = args[1] || '.council/shared_memory.json';
mergeMemory(roundDir, memFile);
