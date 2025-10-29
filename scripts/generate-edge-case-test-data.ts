/**
 * ABOUTME: Generates test CSV files for edge case testing
 * ABOUTME: Creates files at boundary conditions (10MB, 1000 rows, etc.)
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'playwright-tests', 'test-data', 'edge-cases');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🎯 Generating edge case test CSV files...\n');

// Helper to generate CSV row
function generateRow(index: number, dataSize: 'small' | 'medium' | 'large' = 'small'): string {
  const name = `Person ${index}`;
  const company = `Company ${index}`;

  // Add different data sizes for file size testing
  const padding = dataSize === 'large'
    ? 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50)
    : dataSize === 'medium'
    ? 'Lorem ipsum dolor sit amet. '.repeat(10)
    : '';

  return `"${name}","${company}","${padding}"`;
}

// 1. CSV at exactly 10MB (should accept)
console.log('1️⃣  Generating 10MB CSV (at limit)...');
let csv10MB = 'name,company,description\n';
let currentSize = Buffer.byteLength(csv10MB, 'utf8');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10,485,760 bytes (same as BulkProcessor.tsx)
const targetSize10MB = MAX_FILE_SIZE - 5000; // Leave 5KB safety margin to stay under limit

let rowIndex = 1;
// Target ~100 rows, so each row should be ~100KB
const rowData = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(2000); // ~110KB per row

while (currentSize < targetSize10MB) {
  const row = `"Person ${rowIndex}","Company ${rowIndex}","${rowData}"\n`;
  const newSize = Buffer.byteLength(csv10MB + row, 'utf8');

  // Stop if adding this row would exceed target
  if (newSize > targetSize10MB) {
    break;
  }

  csv10MB += row;
  currentSize = newSize;
  rowIndex++;
}

fs.writeFileSync(path.join(OUTPUT_DIR, 'file-10mb-exact.csv'), csv10MB);
console.log(`   ✅ Created file-10mb-exact.csv (${(currentSize / 1024 / 1024).toFixed(2)} MB = ${currentSize.toLocaleString()} bytes, ${rowIndex - 1} rows)`);

// 2. CSV over 10MB (should reject)
console.log('2️⃣  Generating 10.1MB CSV (over limit)...');
let csv10_1MB = csv10MB;
// Add extra rows to push over 10MB
for (let i = 0; i < 100; i++) {
  csv10_1MB += generateRow(rowIndex + i, 'large') + '\n';
}
const size10_1MB = Buffer.byteLength(csv10_1MB, 'utf8');
fs.writeFileSync(path.join(OUTPUT_DIR, 'file-10.1mb-over.csv'), csv10_1MB);
console.log(`   ✅ Created file-10.1mb-over.csv (${(size10_1MB / 1024 / 1024).toFixed(2)} MB)`);

// 3. Empty file (should reject)
console.log('3️⃣  Generating empty file...');
fs.writeFileSync(path.join(OUTPUT_DIR, 'file-empty.csv'), '');
console.log('   ✅ Created file-empty.csv (0 bytes)');

// 4. Non-CSV file (should reject)
console.log('4️⃣  Generating non-CSV file...');
fs.writeFileSync(path.join(OUTPUT_DIR, 'file-not-csv.txt'), 'This is a text file, not a CSV');
console.log('   ✅ Created file-not-csv.txt');

// 5. CSV with 1,000 rows (at limit - should accept)
console.log('5️⃣  Generating 1,000 row CSV (at limit)...');
let csv1000Rows = 'name,company,email\n';
for (let i = 1; i <= 1000; i++) {
  csv1000Rows += `"Person ${i}","Company ${i}","person${i}@example.com"\n`;
}
fs.writeFileSync(path.join(OUTPUT_DIR, 'file-1000-rows.csv'), csv1000Rows);
console.log(`   ✅ Created file-1000-rows.csv (1,000 rows)`);

// 6. CSV with 1,001 rows (over limit - should reject)
console.log('6️⃣  Generating 1,001 row CSV (over limit)...');
let csv1001Rows = csv1000Rows;
csv1001Rows += '"Person 1001","Company 1001","person1001@example.com"\n';
fs.writeFileSync(path.join(OUTPUT_DIR, 'file-1001-rows.csv'), csv1001Rows);
console.log('   ✅ Created file-1001-rows.csv (1,001 rows)');

// 7. CSV with duplicate column names (should reject)
console.log('7️⃣  Generating CSV with duplicate columns...');
const csvDuplicateCols = `name,company,name,email
"Alice","TechCorp","Alice Smith","alice@tech.com"
"Bob","StartupCo","Bob Johnson","bob@startup.com"
`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'file-duplicate-columns.csv'), csvDuplicateCols);
console.log('   ✅ Created file-duplicate-columns.csv (duplicate "name" column)');

// 8. CSV with empty column names (should reject)
console.log('8️⃣  Generating CSV with empty column names...');
const csvEmptyCol = `name,,company,email
"Alice","value","TechCorp","alice@tech.com"
"Bob","value","StartupCo","bob@startup.com"
`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'file-empty-column-name.csv'), csvEmptyCol);
console.log('   ✅ Created file-empty-column-name.csv (empty column #2)');

// 9. CSV with special characters, quotes, newlines (should accept with proper parsing)
console.log('9️⃣  Generating CSV with special characters...');
const csvSpecialChars = `name,company,description
"Alice Smith","Tech, Corp","CEO at ""Tech Corp"" since 2020"
"Bob Johnson","Startup
Co","Founder with line
break"
"Carol Davis","Data & Analytics","Expert in SQL, Python, & R"
`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'file-special-chars.csv'), csvSpecialChars);
console.log('   ✅ Created file-special-chars.csv (commas, quotes, newlines)');

// 10. CSV with Unicode/emoji (should accept)
console.log('🔟  Generating CSV with Unicode/emoji...');
const csvUnicode = `name,company,bio
"José García","Café ☕","Loves coffee ☕ and coding 💻"
"李明","科技公司 🚀","Software engineer from 中国"
"François Müller","Société Générale 🏦","Banking expert from France 🇫🇷"
`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'file-unicode-emoji.csv'), csvUnicode);
console.log('   ✅ Created file-unicode-emoji.csv (Unicode, emoji)');

// 11. Small valid CSV (3 rows - for prompt validation tests)
console.log('1️⃣1️⃣  Generating small valid CSV...');
const csvSmall = `name,company,role
"Alice Smith","TechCorp","CEO"
"Bob Johnson","StartupCo","CTO"
"Carol Davis","DataInc","Analyst"
`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'file-valid-3-rows.csv'), csvSmall);
console.log('   ✅ Created file-valid-3-rows.csv (3 rows, for prompt tests)');

console.log('\n✅ All edge case test files generated successfully!');
console.log(`📁 Output directory: ${OUTPUT_DIR}`);
