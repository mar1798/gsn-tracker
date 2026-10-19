// FIT files arrive from the document picker or from iOS "Open in…" / share sheet as file:// URLs.

export type LocalFile = { uri: string; name: string };

export function isFitFileName(name: string): boolean {
  return /\.fit$/i.test(name.trim());
}

/** A local file URL (`file:///…/Inbox/x.fit`) → file descriptor; anything else → null. */
export function fileFromUrl(url: string): LocalFile | null {
  if (!url.toLowerCase().startsWith('file://')) return null;
  const path = url.slice('file://'.length).split(/[?#]/)[0] ?? '';
  const last = path.split('/').filter(Boolean).pop();
  if (!last) return null;
  let name: string;
  try {
    name = decodeURIComponent(last);
  } catch {
    name = last;
  }
  return { uri: url, name };
}

/** Route of the import screen for a local file. */
export function importHref(file: LocalFile) {
  return { pathname: '/import', params: { uri: file.uri, name: file.name } } as const;
}
