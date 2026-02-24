import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'pages');
if (!fs.existsSync(dir)) process.exit(1);

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
let changedFiles = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Replace invalid tailwind classes like black-500 with slate-500
    const newContent = content.replace(/black-(\d00|\d0)/g, 'slate-$1');

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Fixed colors in ${file}`);
        changedFiles++;
    }
}

console.log(`Color fix script finished. Modified ${changedFiles} files.`);
