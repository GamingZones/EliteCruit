const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('Frontend/src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        getAllFiles(filePath, fileList);
      }
    } else if (/\.(tsx|ts|jsx|js|html|css)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = getAllFiles(srcDir);
const patternMap = new Map();

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  // Match â followed by 1 to 3 non-ascii characters, or Â followed by non-ascii, or other common mojibake
  const matches = content.match(/[\u00C0-\u00FF][\u0080-\u024F\u2000-\u2100\u2500-\u2600]{1,3}/g);
  if (matches) {
    for (const m of matches) {
      if (!patternMap.has(m)) {
        patternMap.set(m, []);
      }
      if (!patternMap.get(m).includes(path.relative(srcDir, file))) {
        patternMap.get(m).push(path.relative(srcDir, file));
      }
    }
  }
}

console.log('Found ' + patternMap.size + ' unique mojibake patterns:');
for (const [pattern, files] of patternMap.entries()) {
  const codePoints = Array.from(pattern).map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
  console.log(`${pattern} (${codePoints.join(' ')}) in ${files.length} files: ${files.slice(0, 3).join(', ')}`);
}
