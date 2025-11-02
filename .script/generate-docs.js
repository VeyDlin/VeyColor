#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function bgrToRgb(bgrHex) {
  const rr = bgrHex.slice(6, 8);
  const gg = bgrHex.slice(4, 6);
  const bb = bgrHex.slice(2, 4);
  return `${rr}${gg}${bb}`.toUpperCase();
}

function parseColorScheme(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const colors = [];

  const v7SectionMatch = content.match(/\[LayerColors_V7\]([\s\S]*?)(?:\[|$)/);
  if (!v7SectionMatch) {
    console.warn(`  No [LayerColors_V7] section found in ${path.basename(filePath)}`);
    return null;
  }

  const section = v7SectionMatch[1];
  const nameRegex = /Name(\d+)=(.+)/g;
  const valueRegex = /Value(\d+)=(.+)/g;
  const names = {};
  const values = {};

  let match;
  while ((match = nameRegex.exec(section)) !== null) {
    names[match[1]] = match[2].trim();
  }

  while ((match = valueRegex.exec(section)) !== null) {
    values[match[1]] = match[2].trim();
  }

  for (let key in names) {
    if (values[key]) {
      colors.push({
        name: names[key],
        bgr: values[key],
        rgb: bgrToRgb(values[key])
      });
    }
  }

  return colors;
}

function generateMarkdown(schemeName, colors, hasScreenshot) {
  const displayName = schemeName.replace(/_/g, ' ');
  let md = `# ${displayName}\n\n`;

  if (hasScreenshot) {
    md += `![Screenshot](../.github/${schemeName}.png)\n\n`;
  }

  md += `## Color Palette\n\n`;
  md += `| Layer Name | Color |\n`;
  md += `|:-----------|:-----:|\n`;

  colors.forEach(color => {
    const hex = color.rgb;
    const badge = `![](https://img.shields.io/badge/${hex}-${hex}?style=flat)`;
    md += `| ${color.name} | ${badge} |\n`;
  });

  return md;
}

function main() {
  console.log('Generating color scheme documentation\n');

  const rootDir = path.join(__dirname, '..');
  const docsDir = path.join(rootDir, '.docs');

  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
    console.log('Created .docs directory\n');
  }

  const files = fs.readdirSync(rootDir)
    .filter(f => f.endsWith('.PCBSysColors'));

  if (files.length === 0) {
    console.error('Error: No .PCBSysColors files found');
    process.exit(1);
  }

  console.log(`Found ${files.length} color scheme(s)\n`);

  let processed = 0;

  files.forEach(file => {
    const schemeName = path.basename(file, '.PCBSysColors');
    const filePath = path.join(rootDir, file);

    console.log(`Processing: ${schemeName}`);

    const colors = parseColorScheme(filePath);
    if (!colors || colors.length === 0) {
      console.log('  Skipped: no colors found\n');
      return;
    }

    console.log(`  Found ${colors.length} colors`);

    const screenshotPath = path.join(rootDir, '.github', `${schemeName}.png`);
    const hasScreenshot = fs.existsSync(screenshotPath);
    console.log(`  Screenshot: ${hasScreenshot ? 'found' : 'not found'}`);

    const markdown = generateMarkdown(schemeName, colors, hasScreenshot);
    const outputPath = path.join(docsDir, `${schemeName}.md`);
    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`  Generated: .docs/${schemeName}.md\n`);

    processed++;
  });

  console.log(`\nGenerated ${processed} documentation file(s)`);
}

main();
