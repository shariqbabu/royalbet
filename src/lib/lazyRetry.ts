import { ComponentType } from 'react';


type ImportFn<T extends ComponentType<any>> = () => Promise<{
  default: T;
}>;


export function lazyRetry<T extends ComponentType<any>>(
  importFn: ImportFn<T>,
  retries = 3,
  interval = 500
): Promise<{ default: T }> {
  return attemptImport(importFn, retries, interval);
}


function attemptImport<T extends ComponentType<any>>(
  importFn: ImportFn<T>,
  retries: number,
  interval: number
): Promise<{ default: T }> {
  return importFn().catch((error: unknown) => {
    if (retries > 0) {
      return new Promise<{ default: T }>((resolve, reject) => {
        setTimeout(() => {
          attemptImport(importFn, retries - 1, interval).then(
            resolve,
            reject
          );
        }, interval);
      });
    }
    return handleStaleChunk<T>(error);
  });
}

function handleStaleChunk<T extends ComponentType<any>>(
  error: unknown
): Promise<{ default: T }> {
  const RELOAD_FLAG = 'lazy-reload';
  const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG);

  if (!alreadyReloaded) {
    sessionStorage.setItem(RELOAD_FLAG, 'true');
    window.location.reload();
    return new Promise<{ default: T }>(() => {});
  }
  sessionStorage.removeItem(RELOAD_FLAG);
  return Promise.reject(error);
}
