'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    let disposed = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        if (!disposed) {
          await registration.update();
        }
      } catch {
        // PWA support is progressive: registration failure must not break the app.
      }
    };

    if (document.readyState === 'complete') {
      void register();
    } else {
      window.addEventListener('load', register, { once: true });
    }

    return () => {
      disposed = true;
      window.removeEventListener('load', register);
    };
  }, []);

  return null;
}
