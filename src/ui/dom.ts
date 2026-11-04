type Attrs = Record<string, unknown>;
type Child = Node | string | number | null | undefined | false | Attrs;
function applyAttrs(el: HTMLElement, attrs: Attrs): void {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, String(v));
  }
}
/** Tiny element builder. `h('div', 'cls', { style: {...} }, child, ...)` is allowed: plain objects among children are attributes. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | string = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (typeof attrs === 'string') el.className = attrs; else applyAttrs(el, attrs);
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    if (c instanceof Node) el.append(c);
    else if (typeof c === 'object') applyAttrs(el, c);
    else el.append(String(c));
  }
  return el;
}
export const clear = (el: Element): void => { while (el.firstChild) el.removeChild(el.firstChild); };
export const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
export function tween(ms: number, step: (t: number) => void, ease: (t: number) => number = t => 1 - Math.pow(1 - t, 3)): Promise<void> {
  return new Promise(res => {
    const t0 = performance.now();
    const f = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      step(ease(t));
      if (t < 1) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
}
export const A = (p: string): string => `${import.meta.env.BASE_URL}assets/${p}`;
