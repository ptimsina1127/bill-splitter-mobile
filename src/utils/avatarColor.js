const PALETTE = [
  '#a93226', '#e74c3c', '#e91e63', '#d35400', '#e67e22',
  '#f39c12', '#d4ac0d', '#7cb342', '#27ae60', '#2ecc71',
  '#0e6655', '#1abc9c', '#17a2b8', '#3498db', '#2980b9',
  '#1a5276', '#3949ab', '#6c3483', '#8e44ad', '#9b59b6',
  '#c2185b', '#a0522d', '#5d4037', '#455a64', '#4a148c',
];

function hexToRgba(hex, alpha) {
  return `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${alpha})`;
}

function luminance(hex) {
  return 0.299 * parseInt(hex.slice(1, 3), 16) / 255
       + 0.587 * parseInt(hex.slice(3, 5), 16) / 255
       + 0.114 * parseInt(hex.slice(5, 7), 16) / 255;
}

export function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = PALETTE[Math.abs(hash) % PALETTE.length];
  return {
    bg: hexToRgba(color, 0.3),
    text: luminance(color) > 0.5 ? '#1e293b' : '#ffffff',
  };
}
