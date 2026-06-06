const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\kalek\\.gemini\\antigravity-ide\\brain\\ee86d699-bd73-462e-a55f-7272fd2235d4\\.system_generated\\logs\\transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let best = '';
  for await (const line of rl) {
    if(!line) continue;
    try {
      const d = JSON.parse(line);
      if(d.type === 'PLANNER_RESPONSE' && d.tool_calls) {
        for(const c of d.tool_calls) {
          if((c.name === 'write_to_file' || c.name === 'replace_file_content' || c.name === 'multi_replace_file_content') && c.args.TargetFile && c.args.TargetFile.includes('OwnerDashboard.jsx')) {
             if (c.args.CodeContent) {
                 best = c.args.CodeContent;
                 console.log("Found write_to_file content!");
             }
          }
        }
      }
    } catch(e) { }
  }
  if (best) {
      fs.writeFileSync('C:\\Users\\kalek\\OneDrive\\Desktop\\Pawna+Villa\\Pawna-camping\\src\\pages\\OwnerDashboard.jsx', best);
      console.log('Restored OwnerDashboard.jsx from write_to_file');
  } else {
      console.log('Could not find write_to_file code content for OwnerDashboard.jsx');
  }
}

processLineByLine();
