/**
 * PERSISTENCE BOUNDARY — browser storage and local file transfer.
 * localStorage stores strings per origin (scheme + host + port), not per folder.
 * It is neither encrypted storage nor a cloud backup. No CRM data is uploaded here.
 */
import { emptyWorkspace, workspaceSchema, type Workspace } from './model';
// Keep the key stable across this commented edition; changing it would hide existing user data.
export const STORAGE_KEY = 'the-linked-list:v1';
/** Load once at App startup. JSON parsing checks syntax; Zod checks the content.
 * On failure, return an error and the raw contents for recovery. The empty value is
 * only a safe UI placeholder; App blocks writes until the user explicitly resets.
 */
export function load(): { data: Workspace; error?: unknown; raw?: string } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    return { data: raw ? workspaceSchema.parse(JSON.parse(raw)) : emptyWorkspace() };
  } catch (error) {
    return { data: emptyWorkspace(), error, raw: raw ?? undefined };
  }
}
/** Validate before writing, and let errors propagate to App.commit.
 * Returning only after setItem succeeds lets React display a snapshot known to be
 * saved. Quota/security errors must not be swallowed as a false success.
 */
export function persist(data: Workspace): Workspace {
  const checked = workspaceSchema.parse(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  return checked;
}
/** Make a local download from in-memory text; this is not an HTTP upload.
 * The temporary object URL references a Blob. Release it after the click has had
 * time to start the download so repeated exports do not retain those references.
 */
export function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Read only user-selected files, after a size check.
 * CSV uses the 2 MiB default; JSON backups receive 16 MiB from App.fileChange.
 * The cap reduces accidental oversized parsing; it is not a performance guarantee.
 */
export async function readFile(file: File, limitMiB = 2): Promise<string> {
  if (file.size > limitMiB * 1024 * 1024)
    throw new Error(`File is larger than ${limitMiB} MiB. Please select a smaller file.`);
  return file.text();
}
