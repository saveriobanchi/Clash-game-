import { sprite, spriteCanvas, spriteUrl } from '../art';

/* All pixel art comes from src/art (original, code-authored). */
export async function loadPixels(): Promise<void> { /* nothing to fetch */ }
export const px = (key: string, size = 48, cls = ''): HTMLImageElement => sprite(key, size, cls);
export const pxCanvas = (key: string): HTMLCanvasElement => spriteCanvas(key, 1);
export const pxUrl = (key: string, scale = 1): string => spriteUrl(key, scale);
