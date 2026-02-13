const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const svgPath = path.join(projectRoot, 'public', 'icon.svg');
const svg = fs.readFileSync(svgPath);

const sizes = [48, 72, 96, 128, 144, 192, 256, 384, 512];

async function generateIcons() {
  console.log('Generating PNG icons...');
  
  for (const size of sizes) {
    const outputPath = path.join(projectRoot, 'public', `icon-${size}.png`);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Created: icon-${size}.png`);
  }
  
  // Create maskable version (with padding)
  const maskableSize = 512;
  const padding = Math.floor(maskableSize * 0.1);
  const innerSize = maskableSize - (padding * 2);
  
  await sharp(svg)
    .resize(innerSize, innerSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    })
    .png()
    .toFile(path.join(projectRoot, 'public', 'icon-maskable-512.png'));
  console.log('Created: icon-maskable-512.png');
  
  await sharp(svg)
    .resize(Math.floor(192 * 0.8), Math.floor(192 * 0.8))
    .extend({
      top: Math.floor(192 * 0.1),
      bottom: Math.floor(192 * 0.1),
      left: Math.floor(192 * 0.1),
      right: Math.floor(192 * 0.1),
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    })
    .png()
    .toFile(path.join(projectRoot, 'public', 'icon-maskable-192.png'));
  console.log('Created: icon-maskable-192.png');
  
  // Create favicon.ico (using 48x48)
  await sharp(svg)
    .resize(32, 32)
    .png()
    .toFile(path.join(projectRoot, 'public', 'favicon.png'));
  console.log('Created: favicon.png');
  
  // Create Apple touch icon
  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile(path.join(projectRoot, 'public', 'apple-touch-icon.png'));
  console.log('Created: apple-touch-icon.png');
  
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
