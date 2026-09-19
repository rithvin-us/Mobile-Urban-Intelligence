/** Loads the Google Maps JavaScript API once per page, shared by every caller. */

const SCRIPT_ID = 'google-maps-js';

let loaderPromise: Promise<typeof google.maps> | null = null;

export function mapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
}

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser'));
  }

  const anyWindow = window as any;
  if (anyWindow.google?.maps) return Promise.resolve(anyWindow.google.maps);
  if (loaderPromise) return loaderPromise;

  const key = mapsApiKey();
  if (!key) return Promise.reject(new Error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'));

  loaderPromise = new Promise((resolve, reject) => {
    // Another component (or a second copy of the script) can swallow the load
    // event, so the namespace is polled as well, and a script that never
    // arrives at all reports instead of leaving the map area silently blank.
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearTimeout(timeout);
      fn();
    };

    const poll = setInterval(() => {
      if (anyWindow.google?.maps) finish(() => resolve(anyWindow.google.maps));
    }, 150);

    const timeout = setTimeout(() => {
      finish(() => {
        loaderPromise = null;
        reject(new Error('Google Maps did not finish loading. Check the API key and the network.'));
      });
    }, 20000);

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const onLoad = () =>
      finish(() => {
        if (anyWindow.google?.maps) resolve(anyWindow.google.maps);
        else reject(new Error('Google Maps loaded without a maps namespace'));
      });

    if (existing) {
      existing.addEventListener('load', onLoad);
      existing.addEventListener('error', () =>
        finish(() => reject(new Error('Google Maps failed to load')))
      );
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry&v=weekly`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', onLoad);
    script.addEventListener('error', () =>
      finish(() => {
        loaderPromise = null;
        reject(new Error('Google Maps failed to load'));
      })
    );
    document.head.appendChild(script);
  });

  return loaderPromise;
}
