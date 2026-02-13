const sharp = require('sharp');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

async function generateScreenshots() {
  console.log('Generating placeholder screenshots...');
  
  // Desktop screenshot (1280x720)
  const desktopSvg = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#111827"/>
          <stop offset="100%" style="stop-color:#000000"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <rect x="0" y="0" width="240" height="720" fill="#0a0a0a"/>
      <text x="120" y="50" text-anchor="middle" fill="#22c55e" font-family="system-ui" font-size="24" font-weight="bold">GitGenius</text>
      <rect x="20" y="80" width="200" height="40" rx="8" fill="#1f2937"/>
      <rect x="20" y="130" width="200" height="40" rx="8" fill="#1f2937"/>
      <rect x="20" y="180" width="200" height="40" rx="8" fill="#1f2937"/>
      <rect x="20" y="230" width="200" height="40" rx="8" fill="#1f2937"/>
      <text x="640" y="80" text-anchor="middle" fill="#ffffff" font-family="system-ui" font-size="32" font-weight="bold">Dashboard</text>
      <rect x="280" y="120" width="280" height="150" rx="12" fill="#1f2937"/>
      <rect x="580" y="120" width="280" height="150" rx="12" fill="#1f2937"/>
      <rect x="880" y="120" width="280" height="150" rx="12" fill="#1f2937"/>
      <text x="420" y="200" text-anchor="middle" fill="#22c55e" font-family="system-ui" font-size="48" font-weight="bold">365</text>
      <text x="420" y="240" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="14">Day Streak</text>
      <text x="720" y="200" text-anchor="middle" fill="#22c55e" font-family="system-ui" font-size="48" font-weight="bold">1.2K</text>
      <text x="720" y="240" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="14">Commits</text>
      <text x="1020" y="200" text-anchor="middle" fill="#22c55e" font-family="system-ui" font-size="48" font-weight="bold">99.9%</text>
      <text x="1020" y="240" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="14">Uptime</text>
      <rect x="280" y="300" width="880" height="380" rx="12" fill="#1f2937"/>
      <text x="320" y="340" fill="#ffffff" font-family="system-ui" font-size="18" font-weight="bold">Contribution Graph</text>
      <!-- Contribution squares -->
      ${generateContributionGrid(320, 370, 50, 7)}
    </svg>
  `;
  
  await sharp(Buffer.from(desktopSvg))
    .png()
    .toFile(path.join(projectRoot, 'public', 'screenshots', 'desktop.png'));
  console.log('Created: screenshots/desktop.png');
  
  // Mobile screenshot (390x844)
  const mobileSvg = `
    <svg width="390" height="844" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgm" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#111827"/>
          <stop offset="100%" style="stop-color:#000000"/>
        </linearGradient>
      </defs>
      <rect width="390" height="844" fill="url(#bgm)"/>
      <rect x="0" y="0" width="390" height="60" fill="#0a0a0a"/>
      <text x="195" y="40" text-anchor="middle" fill="#22c55e" font-family="system-ui" font-size="20" font-weight="bold">GitGenius</text>
      <text x="195" y="100" text-anchor="middle" fill="#ffffff" font-family="system-ui" font-size="24" font-weight="bold">Dashboard</text>
      <rect x="20" y="130" width="165" height="100" rx="12" fill="#1f2937"/>
      <rect x="205" y="130" width="165" height="100" rx="12" fill="#1f2937"/>
      <text x="102" y="180" text-anchor="middle" fill="#22c55e" font-family="system-ui" font-size="32" font-weight="bold">365</text>
      <text x="102" y="210" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="12">Day Streak</text>
      <text x="287" y="180" text-anchor="middle" fill="#22c55e" font-family="system-ui" font-size="32" font-weight="bold">1.2K</text>
      <text x="287" y="210" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="12">Commits</text>
      <rect x="20" y="250" width="350" height="250" rx="12" fill="#1f2937"/>
      <text x="40" y="285" fill="#ffffff" font-family="system-ui" font-size="16" font-weight="bold">Contributions</text>
      <rect x="20" y="520" width="350" height="80" rx="12" fill="#1f2937"/>
      <rect x="20" y="620" width="350" height="80" rx="12" fill="#1f2937"/>
      <rect x="20" y="720" width="350" height="80" rx="12" fill="#1f2937"/>
    </svg>
  `;
  
  await sharp(Buffer.from(mobileSvg))
    .png()
    .toFile(path.join(projectRoot, 'public', 'screenshots', 'mobile.png'));
  console.log('Created: screenshots/mobile.png');
  
  console.log('Screenshots generated!');
}

function generateContributionGrid(startX, startY, cols, rows) {
  let rects = '';
  const colors = ['#0d1117', '#0e4429', '#006d32', '#26a641', '#39d353'];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      rects += `<rect x="${startX + col * 14}" y="${startY + row * 14}" width="10" height="10" rx="2" fill="${color}"/>`;
    }
  }
  return rects;
}

generateScreenshots().catch(console.error);
