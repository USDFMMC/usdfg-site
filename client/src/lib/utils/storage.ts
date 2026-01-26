export const safeLocalStorageGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('⚠️ localStorage getItem failed:', error);
    return null;
  }
};

export const safeLocalStorageSetItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn('⚠️ localStorage setItem failed:', error);
  }
};

export const safeLocalStorageRemoveItem = (key: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn('⚠️ localStorage removeItem failed:', error);
  }
};

export const safeSessionStorageGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch (error) {
    console.warn('⚠️ sessionStorage getItem failed:', error);
    return null;
  }
};

export const safeSessionStorageSetItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch (error) {
    console.warn('⚠️ sessionStorage setItem failed:', error);
  }
};

export const safeSessionStorageRemoveItem = (key: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch (error) {
    console.warn('⚠️ sessionStorage removeItem failed:', error);
  }
};
