
import fs from 'fs';

const content = fs.readFileSync('c:/Users/Marketation/Desktop/redigo/pages/Admin.tsx', 'utf8');

function count(str, pattern) {
    return (str.match(pattern) || []).length;
}

console.log('Braces { :', count(content, /\{/g));
console.log('Braces } :', count(content, /\}/g));
console.log('Parens ( :', count(content, /\(/g));
console.log('Parens ) :', count(content, /\)/g));
console.log('Fragments <> :', count(content, /<>/g));
console.log('Final Fragments </> :', count(content, /<\/>/g));

// Check specifically around settings/logs transition
const lines = content.split('\n');
for (let i = 1725; i < 1745; i++) {
    if (lines[i]) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
}
