import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.jsx');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if(content.includes('<img ') && !content.includes('loading="lazy"')) {
    content = content.replace(/<img /g, '<img loading="lazy" ');
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
