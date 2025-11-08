let lockDepth = 0;
const previousOverflowAttr = 'data-usdfg-scroll-previous-overflow';

const isBrowser = typeof document !== 'undefined';

export const lockBodyScroll = () => {
  if (!isBrowser) return;

  lockDepth += 1;
  if (lockDepth === 1) {
    const body = document.body;
    body.setAttribute(previousOverflowAttr, body.style.overflow || '');
    body.style.overflow = 'hidden';
  }
};

export const unlockBodyScroll = () => {
  if (!isBrowser || lockDepth === 0) return;

  lockDepth = Math.max(0, lockDepth - 1);
  if (lockDepth === 0) {
    const body = document.body;
    const previous = body.getAttribute(previousOverflowAttr) ?? '';
    body.style.overflow = previous;
    body.removeAttribute(previousOverflowAttr);
  }
};

export const resetBodyScrollLock = () => {
  if (!isBrowser) return;
  lockDepth = 0;
  const body = document.body;
  const previous = body.getAttribute(previousOverflowAttr) ?? '';
  body.style.overflow = previous;
  body.removeAttribute(previousOverflowAttr);
};

