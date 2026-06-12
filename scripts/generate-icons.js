const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 1024;
const ASSETS = path.join(__dirname, '..', 'assets', 'images');

function drawBackground(ctx) {
  const bgGrad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bgGrad.addColorStop(0, '#0ea5e9');
  bgGrad.addColorStop(1, '#6366f1');
  ctx.fillStyle = bgGrad;

  const r = 180;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(SIZE - r, 0);
  ctx.quadraticCurveTo(SIZE, 0, SIZE, r);
  ctx.lineTo(SIZE, SIZE - r);
  ctx.quadraticCurveTo(SIZE, SIZE, SIZE - r, SIZE);
  ctx.lineTo(r, SIZE);
  ctx.quadraticCurveTo(0, SIZE, 0, SIZE - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();
}

function drawForeground(ctx) {
  const mid = SIZE / 2;

  const innerSize = 840;
  const innerX = (SIZE - innerSize) / 2;
  const innerY = (SIZE - innerSize) / 2;
  const innerR = 200;

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(innerX + innerR, innerY);
  ctx.lineTo(innerX + innerSize - innerR, innerY);
  ctx.quadraticCurveTo(innerX + innerSize, innerY, innerX + innerSize, innerY + innerR);
  ctx.lineTo(innerX + innerSize, innerY + innerSize - innerR);
  ctx.quadraticCurveTo(innerX + innerSize, innerY + innerSize, innerX + innerSize - innerR, innerY + innerSize);
  ctx.lineTo(innerX + innerR, innerY + innerSize);
  ctx.quadraticCurveTo(innerX, innerY + innerSize, innerX, innerY + innerSize - innerR);
  ctx.lineTo(innerX, innerY + innerR);
  ctx.quadraticCurveTo(innerX, innerY, innerX + innerR, innerY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 440px sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;
  ctx.shadowBlur = 16;
  ctx.fillText('B', mid, mid - 20);
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(SIZE - 100, SIZE - 100, 200, 0, Math.PI * 2);
  ctx.fill();
}

// icon.png — full icon with gradient background
const icon = createCanvas(SIZE, SIZE);
const iconCtx = icon.getContext('2d');
drawBackground(iconCtx);
drawForeground(iconCtx);
fs.writeFileSync(path.join(ASSETS, 'icon.png'), icon.toBuffer('image/png'));
console.log('✅ icon.png');

// adaptive-icon.png — full icon (background from app.json is #0ea5e9,
// but foreground should include the gradient for the full look)
const adap = createCanvas(SIZE, SIZE);
const adapCtx = adap.getContext('2d');
drawBackground(adapCtx);
drawForeground(adapCtx);
fs.writeFileSync(path.join(ASSETS, 'adaptive-icon.png'), adap.toBuffer('image/png'));
console.log('✅ adaptive-icon.png');
