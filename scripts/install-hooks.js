const fs = require('fs');
const path = require('path');

const hookSrc = path.join(__dirname, 'pre-push-migrate.sh');
const hookDest = path.join(__dirname, '..', '.git', 'hooks', 'pre-push');

// Ensure hooks directory exists
const hooksDir = path.dirname(hookDest);
if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

fs.copyFileSync(hookSrc, hookDest);
try {
  fs.chmodSync(hookDest, '755');
} catch {
  // chmod may not work on Windows, but git bash handles it
}
console.log('pre-push hook installed');
