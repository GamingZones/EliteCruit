const fs = require('fs');
const path = require('path');

const targetFiles = [
  'Frontend/src/pages/Applicant/Applicant-Dashboard.tsx',
  'Frontend/src/pages/Applicant/Applicant-Feedback.tsx',
  'Frontend/src/pages/Applicant/ApplicantProfile.tsx',
  'Frontend/src/pages/Applicant/JobSearch.tsx',
  'Frontend/src/pages/Common/Messages.tsx',
  'Frontend/src/pages/Common/Notifications.tsx',
  'Frontend/src/pages/Employer/Employer-ApplicantFinder.tsx',
  'Frontend/src/pages/Employer/Employer-ApplicantManagement.tsx',
  'Frontend/src/pages/Employer/Employer-CompanyProfile.tsx',
  'Frontend/src/pages/Employer/Employer-JobPosts.tsx',
  'Frontend/src/pages/Employer/Employer-NoticesFaqs.tsx',
];

const replacementRules = [
  // Multi-character / emoji first
  { from: /âš\u00a0ï¸\u008f|âš\u00a0ï¸|âš\u00a0ï/g, to: '⚠️' },
  { from: /ðŸ“¥/g, to: '📥' },
  { from: /ðŸ“\u008d|ðŸ“ /g, to: '📍' },

  // Stars & Ratings
  { from: /â˜…/g, to: '★' },

  // Bullets & Dots
  { from: /Â·/g, to: '·' },
  { from: /â€¢/g, to: '•' },
  { from: /â€¦/g, to: '…' },

  // Checkmarks & Crosses
  { from: /âœ“/g, to: '✓' },
  { from: /âœ•/g, to: '✕' },
  { from: /âœ—/g, to: '✗' },
  { from: /Ã—/g, to: '×' },

  // Arrows
  { from: /â†\u0090|â† /g, to: '←' },
  { from: /â†—/g, to: '↗' },
  { from: /â–²/g, to: '▲' },
  { from: /â–¼/g, to: '▼' },
  { from: /â—„/g, to: '◄' },
  { from: /â–º/g, to: '►' },
  { from: /â€¹/g, to: '‹' },
  { from: /â€º/g, to: '›' },

  // Dashes & Lines
  { from: /â€”/g, to: '—' },
  { from: /â€“/g, to: '–' },
  { from: /â –/g, to: '–' },
  { from: /â\x9D–/g, to: '–' },
  { from: /â”€/g, to: '─' },
  { from: /â•\x90|â• /g, to: '═' },
  { from: /âˆ’/g, to: '−' },

  // Symbols & Currency
  { from: /â‚±/g, to: '₱' },
  { from: /â–£/g, to: '▣' },
  { from: /â—‰/g, to: '◉' },
  { from: /â—‹/g, to: '○' },
  { from: /Ã±/g, to: 'ñ' },
];

const isApply = process.argv.includes('--apply');
console.log(`--- ${isApply ? 'APPLYING FIXES' : 'DRY RUN / SCANNING REPLACEMENTS'} ---`);
let totalMatches = 0;

for (const relPath of targetFiles) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    continue;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  let fileMatches = 0;

  for (const { from, to } of replacementRules) {
    const matches = content.match(from);
    if (matches) {
      fileMatches += matches.length;
      totalMatches += matches.length;
    }
    content = content.replace(from, to);
  }

  // Check if any mojibake remains
  const remaining = content.match(/[\u00C2-\u00C3\u00E2\u00F0][\u0080-\u024F\u2000-\u2600]{1,3}/g);
  console.log(`${relPath}: ${fileMatches} fixed, ${remaining ? remaining.length : 0} remaining.`);
  if (remaining) {
    console.log('  Remaining samples:', remaining.slice(0, 5));
  }

  if (isApply && fileMatches > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`  -> Successfully wrote updated UTF-8 content to ${relPath}`);
  }
}

console.log(`\nTotal occurrences ${isApply ? 'repaired' : 'to fix'}: ${totalMatches}`);
