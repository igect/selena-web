/**
 * Selena Media Archive — Batch WebP Image Converter
 * 
 * Usage:
 *   node scripts/optimize-images.cjs [sourceDir] [targetDir]
 */

const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('Selena Media Archive — WebP Image Converter Tool');
console.log('================================================================');

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, fileList);
    } else if (/\.(jpg|jpeg|png)$/i.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const sourceDir = process.argv[2] || path.join('assets', 'images');
const images = walk(sourceDir);
console.log(`Discovered ${images.length} images in ${sourceDir}`);
console.log('Ready for conversion with sharp: npm install sharp');
