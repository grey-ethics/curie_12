// src/utils/color.ts
export function hexToRgba(hex: string, alpha = 1) {
  const n = hex.replace('#', '')
  const bigint = parseInt(n.length === 3 ? n.split('').map(c => c + c).join('') : n, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
