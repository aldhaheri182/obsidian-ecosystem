/**
 * Obsidian Ecosystem — Custom Cursor
 * Authorized by: Cinematic UI spec Part 0.3.
 *
 * Hides the native cursor and renders a themed radial gradient dot that
 * follows the pointer. The dot changes size/color based on hover target
 * (clickable, destructive, command-mode) via semantic data-cursor attributes.
 *
 * Usage: <button data-cursor="clickable"> ... </button>
 */

type CursorMode = 'default' | 'clickable' | 'command-mode' | 'destructive';

const MODE_CLASSES: Record<CursorMode, string> = {
  default: '',
  clickable: 'clickable',
  'command-mode': 'command-mode',
  destructive: 'destructive',
};

let cursorEl: HTMLDivElement | null = null;
let currentMode: CursorMode = 'default';

function setMode(mode: CursorMode): void {
  if (!cursorEl || mode === currentMode) return;
  for (const cls of Object.values(MODE_CLASSES)) {
    if (cls) cursorEl.classList.remove(cls);
  }
  if (MODE_CLASSES[mode]) cursorEl.classList.add(MODE_CLASSES[mode]);
  currentMode = mode;
}

function resolveMode(target: EventTarget | null): CursorMode {
  let el = target as HTMLElement | null;
  while (el && el !== document.body) {
    const attr = el.getAttribute?.('data-cursor');
    if (attr && attr in MODE_CLASSES) return attr as CursorMode;
    if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute?.('role') === 'button') {
      return 'clickable';
    }
    el = el.parentElement;
  }
  return 'default';
}

export function installCursor(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('obsidian-cursor')) return;

  cursorEl = document.createElement('div');
  cursorEl.id = 'obsidian-cursor';
  document.body.appendChild(cursorEl);

  // rAF-batched pointer tracking.
  let rafId = 0;
  let lastX = 0;
  let lastY = 0;
  const update = () => {
    if (cursorEl) {
      cursorEl.style.transform = `translate(${lastX}px, ${lastY}px) translate(-50%, -50%)`;
    }
    rafId = 0;
  };

  document.addEventListener(
    'pointermove',
    (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      setMode(resolveMode(e.target));
      if (!rafId) rafId = requestAnimationFrame(update);
    },
    { passive: true },
  );

  // Hide off-screen.
  document.addEventListener('pointerleave', () => {
    if (cursorEl) cursorEl.style.opacity = '0';
  });
  document.addEventListener('pointerenter', () => {
    if (cursorEl) cursorEl.style.opacity = '1';
  });
}
