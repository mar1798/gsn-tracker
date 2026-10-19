import { fileFromUrl } from '@/lib/fit-file';

/**
 * iOS opens the app with a file:// URL when a .fit file is shared to it ("Open in…",
 * registered via CFBundleDocumentTypes in app.json). Route such URLs to the import screen.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const file = fileFromUrl(path);
    if (!file) return path;
    const params = new URLSearchParams({ uri: file.uri, name: file.name });
    return `/import?${params.toString()}`;
  } catch {
    return '/';
  }
}
