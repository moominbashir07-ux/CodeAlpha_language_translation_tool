const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function parse() {
  const logPath = 'C:\\Users\\moomi\\.gemini\\antigravity-ide\\brain\\a95cbf92-0df5-42c7-ac64-c63b23701a6b\\.system_generated\\tasks\\task-400.log';
  const fileStream = fs.createReadStream(logPath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('Searching for "sourceLanguage":"auto" in task-400.log...');
  let count = 0;
  for await (const line of rl) {
    if (line.includes('"sourceLanguage":"auto"')) {
      console.log(line);
      count++;
      if (count >= 30) {
        console.log('... truncated after 30 matches');
        break;
      }
    }
  }
}

parse();
