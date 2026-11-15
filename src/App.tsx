/**
 * UI AND APPLICATION COORDINATOR.
 *
 * Reading map: shared visual components -> EditorForm -> App state -> actions ->
 * derived lists -> page JSX -> dialogs. model.ts owns domain rules; storage.ts
 * owns saving. This file connects them to user actions rather than duplicating them.
 *
 * Trace an add: EditorForm.submit -> save -> commit -> persist -> setData -> render.
 * Forms use native inputs + FormData (uncontrolled); search/filter controls use
 * React state (controlled). A future refactor can extract each screen unchanged.
 */
import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Download,
  ExternalLink,
  Flower2,
  LayoutDashboard,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  type Collection,
  type Contact,
  type Job,
  type Message,
  type Reminder,
  type Workspace,
  dateTimeLocal,
  emptyWorkspace,
  errorText,
  formatDate,
  identityKeys,
  nurture,
  removeContact,
  stages,
  uid,
  weeklyActivity,
  workspaceSchema,
} from './model';
import { parseConnections, type ImportPreview } from './import';
import { download, load, persist, readFile, STORAGE_KEY } from './storage';
import { demoWorkspace } from './demo';

// Literal unions catch misspelled page/collection names during TypeScript checking.
type Page = 'Overview' | 'Network' | 'Messages' | 'Follow-ups' | 'Applications' | 'Data & settings';
// value absent means create; value present means edit. contactId can preselect a
// person for a new message/reminder. The runtime schema still validates the result.
type Editor = { type: Collection; value?: Contact | Message | Reminder | Job; contactId?: string };
// A shared navigation definition keeps visible labels, icons, and page selection together.
const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Network', icon: Users },
  { label: 'Messages', icon: MessageSquare },
  { label: 'Follow-ups', icon: Bell },
  { label: 'Applications', icon: BriefcaseBusiness },
  { label: 'Data & settings', icon: Settings2 },
] as const;
// Initials provide local avatars without fetching profile photos or other remote assets.
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
/** Small presentational components receive props and do not mutate workspace data. */
function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  return <span className={`avatar color-${index % 5}`}>{initials(name)}</span>;
}
/** Reusable onboarding/no-results content; optional children supply a contextual action. */
function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Flower2 size={32} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
/** Associate a visible label with its one native input/select/textarea child.
 * useId gives each rendered field a unique ID. cloneElement adds it to the child
 * without changing its other props; htmlFor makes the label clickable/accessible.
 */
function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children as ReactElement<{ id?: string }>, { id })}
    </div>
  );
}
/** Wrap the browser's native modal dialog instead of manually rebuilding focus trapping.
 * showModal is imperative, so it belongs in an effect after the DOM node mounts.
 * Native cancel (Escape) updates React state via close; cleanup restores opener focus.
 */
function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    // Remember where keyboard focus should return when this dialog unmounts.
    const opener = document.activeElement as HTMLElement | null;
    el.showModal();
    return () => {
      el.close();
      opener?.focus();
    };
  }, []);
  return (
    <dialog className={wide ? 'wide' : ''} ref={ref} aria-labelledby="modal-title" onCancel={close}>
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
/** One editing dialog with a branch for each record type.
 * Unsaved edits live in native form controls. We read a snapshot on submit and
 * close only after validation AND persistence succeed, retaining fields on errors.
 */
function EditorForm({
  editor,
  data,
  save,
  close,
  errorDetail,
}: {
  editor: Editor;
  data: Workspace;
  save: (type: Collection, row: Contact | Message | Reminder | Job) => boolean;
  close: () => void;
  errorDetail: string;
}) {
  const [error, setError] = useState('');
  const value = editor.value;
  // These assertions make branch-specific defaults convenient; they are NOT runtime
  // validation. Each branch uses the matching editor.type; persist validates the snapshot.
  const c = value as Contact | undefined,
    m = value as Message | undefined,
    r = value as Reminder | undefined,
    j = value as Job | undefined;
  const typeName = {
    contacts: 'contact',
    messages: 'message',
    reminders: 'reminder',
    jobs: 'application',
  }[editor.type];
  // Prevent page navigation, extract named inputs, build one record, then delegate saving.
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const s = (key: string) => String(fd.get(key) ?? '').trim();
    // Preserve IDs on edits so relationships and React list keys remain stable.
    const id = value?.id ?? uid();
    try {
      let row: Contact | Message | Reminder | Job;
      // FormData values are strings. Convert numbers/local datetimes before root validation.
      switch (editor.type) {
        case 'contacts':
          row = {
            id,
            name: s('name'),
            role: s('role'),
            company: s('company'),
            email: s('email'),
            linkedin: s('linkedin'),
            notes: s('notes'),
            tags: s('tags')
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
            intervalDays: Number(s('intervalDays')),
            // Editing a person should not reset when their record was originally added.
            createdAt: c?.createdAt ?? new Date().toISOString(),
          };
          break;
        case 'messages':
          row = {
            id,
            contactId: s('contactId'),
            direction: s('direction') as Message['direction'],
            body: s('body'),
            // Interpret the input in the browser timezone, then store an absolute instant.
            at: new Date(s('at')).toISOString(),
          };
          break;
        case 'reminders':
          row = {
            id,
            contactId: s('contactId'),
            title: s('title'),
            dueAt: new Date(s('dueAt')).toISOString(),
            draft: s('draft'),
            // Editing a title/draft must preserve the task completion state.
            done: r?.done ?? false,
          };
          break;
        case 'jobs':
          row = {
            id,
            company: s('company'),
            role: s('role'),
            kind: s('kind') as Job['kind'],
            status: s('status') as Job['status'],
            url: s('url'),
            deadline: s('deadline'),
            contactId: s('contactId'),
            notes: s('notes'),
          };
          break;
      }
      // Parent returns false for validation or storage errors, so the dialog stays open.
      if (save(editor.type, row)) close();
      else setError('Could not save. Check the error below, correct the fields, and try again.');
    } catch (err) {
      setError(errorText(err));
    }
  }
  // Jobs may be unlinked; message/reminder records require an existing contact.
  const contactSelect = (optional = false) => (
    <Field label={optional ? 'Linked contact (optional)' : 'Contact *'}>
      <select
        name="contactId"
        required={!optional}
        defaultValue={editor.contactId ?? (value && 'contactId' in value ? value.contactId : '')}
      >
        <option value="">
          {optional ? 'No linked contact' : 'Choose someone in your network'}
        </option>
        {data.contacts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <Modal
      title={`${value ? 'Edit' : editor.type === 'messages' ? 'Log' : 'Add'} ${typeName}`}
      close={close}
    >
      <form onSubmit={submit}>
        {editor.type === 'contacts' && (
          <>
            <Field label="Full name *">
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={c?.name}
                placeholder="e.g. Alex Morgan"
                autoFocus
              />
            </Field>
            <div className="form-grid">
              <Field label="Role">
                <input
                  name="role"
                  maxLength={200}
                  defaultValue={c?.role}
                  placeholder="Software Engineer"
                />
              </Field>
              <Field label="Company">
                <input
                  name="company"
                  maxLength={200}
                  defaultValue={c?.company}
                  placeholder="Where they work"
                />
              </Field>
            </div>
            <Field label="Email">
              <input
                name="email"
                type="email"
                defaultValue={c?.email}
                placeholder="alex@example.com"
              />
            </Field>
            <Field label="LinkedIn profile URL">
              <input
                name="linkedin"
                type="url"
                defaultValue={c?.linkedin}
                placeholder="https://www.linkedin.com/in/..."
              />
            </Field>
            <div className="form-grid">
              <Field label="Tags (comma separated)">
                <input
                  name="tags"
                  defaultValue={c?.tags.join(', ')}
                  placeholder="Mentor, Engineering"
                />
              </Field>
              <Field label="Follow-up interval (days) *">
                <input
                  name="intervalDays"
                  type="number"
                  min="1"
                  max="365"
                  required
                  defaultValue={c?.intervalDays ?? 30}
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                name="notes"
                maxLength={10000}
                defaultValue={c?.notes}
                placeholder="The little things worth remembering."
              />
            </Field>
          </>
        )}
        {editor.type === 'messages' && (
          <>
            {contactSelect()}
            <div className="form-grid">
              <Field label="Direction *">
                <select name="direction" defaultValue={m?.direction ?? 'outgoing'}>
                  <option value="outgoing">Outgoing · you sent it</option>
                  <option value="incoming">Incoming · they sent it</option>
                </select>
              </Field>
              <Field label="Sent / received at *">
                <input
                  name="at"
                  type="datetime-local"
                  required
                  defaultValue={dateTimeLocal(m ? new Date(m.at) : new Date())}
                />
              </Field>
            </div>
            <Field label="Message *">
              <textarea
                name="body"
                required
                maxLength={10000}
                defaultValue={m?.body}
                placeholder="Log what was actually sent. Save unsent drafts as reminders."
                rows={6}
              />
            </Field>
          </>
        )}
        {editor.type === 'reminders' && (
          <>
            {contactSelect()}
            <Field label="Reminder title *">
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={r?.title}
                placeholder="Catch up over coffee"
              />
            </Field>
            <Field label="Remind me at *">
              <input
                name="dueAt"
                type="datetime-local"
                required
                defaultValue={dateTimeLocal(r ? new Date(r.dueAt) : new Date())}
              />
            </Field>
            <Field label="Message draft">
              <textarea
                name="draft"
                maxLength={10000}
                defaultValue={r?.draft}
                rows={5}
                placeholder="A thoughtful hello, ready when you are."
              />
            </Field>
            <p className="help-text">
              In-app reminder only. You send the message yourself; mark done after acting.
            </p>
          </>
        )}
        {editor.type === 'jobs' && (
          <>
            <div className="form-grid">
              <Field label="Company *">
                <input
                  name="company"
                  required
                  maxLength={200}
                  defaultValue={j?.company}
                  placeholder="Company name"
                />
              </Field>
              <Field label="Role *">
                <input
                  name="role"
                  required
                  maxLength={200}
                  defaultValue={j?.role}
                  placeholder="Software Engineering Intern"
                />
              </Field>
            </div>
            <div className="form-grid">
              <Field label="Opportunity type">
                <select name="kind" defaultValue={j?.kind ?? 'Internship'}>
                  <option>Internship</option>
                  <option>Job</option>
                </select>
              </Field>
              <Field label="Stage">
                <select name="status" defaultValue={j?.status ?? 'Wishlist'}>
                  {stages.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Posting URL">
              <input
                type="url"
                name="url"
                defaultValue={j?.url}
                placeholder="https://company.com/careers/..."
              />
            </Field>
            <Field label="Application deadline">
              <input type="date" name="deadline" defaultValue={j?.deadline} />
            </Field>
            {contactSelect(true)}
            <Field label="Notes & next steps">
              <textarea
                name="notes"
                maxLength={10000}
                defaultValue={j?.notes}
                placeholder="Interview details, requirements, or what excites you."
              />
            </Field>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {errorDetail || error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={close}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            {editor.type === 'messages' ? 'Log message' : 'Save ' + typeName}
            <Check size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
/** Own the persisted snapshot and the temporary state that controls what the user sees.
 * Navigation, search, open dialogs, notices and upload previews are not saved data.
 */
export default function App() {
  // Passing the load function makes this a lazy initializer, not a storage read on every render.
  const [initial] = useState(load);
  const [data, setData] = useState(initial.data);
  // An unreadable snapshot is protected until explicit reset; never auto-save over it.
  const [recovery, setRecovery] = useState(!!initial.error);
  const [conflict, setConflict] = useState(false);
  const [page, setPage] = useState<Page>('Overview');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Upload candidates are isolated from data until the user confirms an import/restore.
  const [csv, setCsv] = useState<ImportPreview | null>(null);
  const [restore, setRestore] = useState<Workspace | null>(null);
  const [now, setNow] = useState(new Date());
  const [stage, setStage] = useState('All stages');
  // These effects subscribe to the outside world; all data writes remain explicit actions.
  // This clock rerenders due-state while the app is open, not a background notification service.
  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 60000);
    // storage events are delivered for OTHER documents, not this tab's own writes.
    // key=null includes localStorage.clear(). This guard does not make simultaneous writes atomic.
    const changed = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) setConflict(true);
    };
    window.addEventListener('storage', changed);
    return () => {
      // Clean up subscriptions if App unmounts, preventing duplicate timers/listeners.
      clearInterval(clock);
      window.removeEventListener('storage', changed);
    };
  }, []);
  /** Central save gate: reject unsafe editing modes, validate/write, THEN update React.
   * A failed write leaves the previous displayed and persisted snapshot in place.
   */
  function commit(next: Workspace, message = 'Saved to this browser.') {
    if (recovery || conflict) {
      setError('Editing is paused. Resolve the recovery or other-tab notice first.');
      return false;
    }
    try {
      // Order matters: displaying next before this call succeeds could falsely imply it was saved.
      const checked = persist(next);
      setData(checked);
      setError('');
      setNotice(message);
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    }
  }
  /** Create or replace one record by ID; the root schema checks the resulting whole workspace. */
  function save(type: Collection, row: Contact | Message | Reminder | Job) {
    try {
      if (type === 'contacts') {
        // Exclude this same ID so an edit does not count itself as a duplicate.
        const keys = identityKeys(row as Contact);
        if (
          data.contacts.some(
            (c) => c.id !== row.id && identityKeys(c).some((key) => keys.includes(key)),
          )
        )
          throw new Error(
            'A contact with that email or LinkedIn profile already exists. Edit the existing contact instead.',
          );
      }
      // Spread/map create new arrays/objects rather than mutating React state.
      // The computed property [type] replaces only the selected collection.
      const rows = data[type] as Array<Contact | Message | Reminder | Job>;
      return commit({
        ...data,
        [type]: rows.some((x) => x.id === row.id)
          ? rows.map((x) => (x.id === row.id ? row : x))
          : [...rows, row],
      });
    } catch (err) {
      setError(errorText(err));
      return false;
    }
  }
  /** Ask before destructive operations; contacts need the domain-level cascade helper.
   * Native browser confirmation is separate from our HTML <dialog> components.
   */
  function remove(type: Collection, id: string) {
    if (
      !confirm(
        type === 'contacts'
          ? 'Delete this contact, all their messages and reminders? Applications will be kept without this contact. This cannot be undone.'
          : 'Delete this record? This cannot be undone.',
      )
    )
      return;
    if (
      commit(
        type === 'contacts'
          ? removeContact(data, id)
          : { ...data, [type]: data[type].filter((x) => x.id !== id) },
        'Record deleted.',
      )
    )
      setSelected(null);
  }
  // Reset the shared search when switching screens so a previous query does not hide new content.
  function navigate(next: Page) {
    setPage(next);
    setQuery('');
    setNotice('');
  }
  // Demo fixtures are opt-in and cannot silently replace or mix with an existing workspace.
  function loadDemo() {
    if (data.contacts.length || data.messages.length || data.jobs.length || data.reminders.length) {
      setError('Export and clear your workspace before loading demo data.');
      return;
    }
    commit(
      demoWorkspace(),
      'Fictional demo workspace loaded. Explore, edit, and make it your own.',
    );
  }
  /** Read -> parse/validate -> preview. No persist/commit occurs in this handler.
   * JSON syntax validity alone does not establish schema version or valid references.
   */
  async function fileChange(file: File | undefined, kind: 'csv' | 'json') {
    if (!file) return;
    try {
      const contents = await readFile(file, kind === 'json' ? 16 : 2);
      if (kind === 'csv') setCsv(parseConnections(contents, data.contacts));
      else setRestore(workspaceSchema.parse(JSON.parse(contents)));
      setError('');
    } catch (err) {
      setError(errorText(err));
    }
  }
  // Derived views below are recomputed from data; do not persist duplicate counts or filtered arrays.
  const person = (id: string) => data.contacts.find((c) => c.id === id);
  const matches = (...values: string[]) =>
    values.join(' ').toLowerCase().includes(query.toLowerCase());
  // +now converts Date to milliseconds; numeric comparisons handle differently offset ISO timestamps.
  const due = data.reminders
    .filter((r) => !r.done && Date.parse(r.dueAt) <= +now)
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  // This list intentionally includes ALL open tasks, including overdue ones.
  const upcoming = data.reminders
    .filter((r) => !r.done)
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  // Prioritize never-contacted people, then the most overdue relative to each
  // person's chosen interval. The name tie-breaker gives no-history contacts a stable order.
  const needsLove = data.contacts
    .map((c) => ({ contact: c, ...nurture(c, data.messages, now) }))
    .filter((n) => n.due)
    .sort((a, b) =>
      a.last === null
        ? b.last === null
          ? a.contact.name.localeCompare(b.contact.name)
          : -1
        : b.last === null
          ? 1
          : b.days - b.contact.intervalDays - (a.days - a.contact.intervalDays),
    );
  const weeks = weeklyActivity(data.messages, now);
  // A minimum denominator of 1 avoids NaN/Infinity bar heights in an empty workspace.
  const maxWeek = Math.max(1, ...weeks.map((w) => w.incoming + w.outgoing));
  const activeJobs = data.jobs.filter((j) => ['Applied', 'Interviewing'].includes(j.status));
  // Record<Page, ...> requires a title/subtitle for every page in the Page union.
  const titles: Record<Page, [string, string]> = {
    Overview: [
      'A little connection goes a long way.',
      'Your people, your plans, and your next chapter. All in one place.',
    ],
    Network: [
      'Good people. Keep them close.',
      'A little context makes every conversation more meaningful.',
    ],
    Messages: [
      'Keep the conversation going.',
      'A history of the small moments that build a strong network.',
    ],
    'Follow-ups': [
      'Make room for a thoughtful hello.',
      'Turn good intentions into small, meaningful actions.',
    ],
    Applications: [
      'Your next chapter starts here.',
      'Keep track of the opportunities you want to turn into something real.',
    ],
    'Data & settings': [
      'Your workspace. Your data.',
      'Bring your network along, and keep a backup close.',
    ],
  };
  // Reuse the create dialog behind each page's primary action.
  const pageAction =
    page === 'Network'
      ? ['Add contact', 'contacts']
      : page === 'Messages'
        ? ['Log message', 'messages']
        : page === 'Follow-ups'
          ? ['Add reminder', 'reminders']
          : page === 'Applications'
            ? ['Add application', 'jobs']
            : null;
  // Store selection as an ID and look up the current object, avoiding stale copied profile data.
  const activePerson = selected ? person(selected) : undefined;
  const addReminder = (contactId: string) => setEditor({ type: 'reminders', contactId });
  // Shared renderer for overview and follow-up lists. Toggling done updates only
  // the task record, never manufactures a sent message or resets the nurture clock.
  const reminderRow = (r: Reminder) => (
    <div className={`reminder-row ${r.done ? 'completed' : ''}`} key={r.id}>
      <button
        className="check-button"
        aria-label={r.done ? 'Reopen ' + r.title : 'Mark done ' + r.title}
        onClick={() => save('reminders', { ...r, done: !r.done })}
      >
        {r.done && <Check size={14} />}
      </button>
      <Avatar
        name={person(r.contactId)?.name ?? '?'}
        index={data.contacts.findIndex((c) => c.id === r.contactId)}
      />
      <div className="grow">
        <button
          className="text-button row-title"
          onClick={() => setEditor({ type: 'reminders', value: r })}
        >
          {r.title}
        </button>
        <p>
          {person(r.contactId)?.name} <span className="dot">·</span> {formatDate(r.dueAt)}
        </p>
        {page === 'Follow-ups' && r.draft && <p className="draft">{r.draft}</p>}
      </div>
      <span className={`badge ${r.done ? 'green' : Date.parse(r.dueAt) <= +now ? 'orange' : ''}`}>
        {r.done ? 'Done' : Date.parse(r.dueAt) <= +now ? 'Due' : 'Upcoming'}
      </span>
      {page === 'Follow-ups' && (
        <button
          className="icon-button"
          aria-label={'Delete ' + r.title}
          onClick={() => remove('reminders', r.id)}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('Overview');
          }}
        >
          <span className="brand-mark">
            <Link2 size={24} />
          </span>
          <span>
            the linked list<span className="brand-dot">.</span>
            <small>A LITTLE MORE CONNECTED</small>
          </span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {/* Stable page labels serve as keys; the active page is also conveyed with aria-current. */}
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-link ${page === label ? 'active' : ''}`}
              aria-current={page === label ? 'page' : undefined}
              onClick={() => navigate(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {/* Hide this decorative count from the button name so it remains consistently "Follow-ups". */}
              {label === 'Follow-ups' && due.length > 0 && (
                <span className="nav-count" aria-hidden="true">
                  {due.length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Flower2 size={25} />
            <h3>
              Networks grow
              <br />
              one hello at a time.
            </h3>
            <p>A small step today could open a new door tomorrow.</p>
          </div>
          <div className="local-status">
            <span />
            Local workspace
            <ShieldCheck size={15} />
          </div>
          <p className="private-caption">Private to this browser. Back up often.</p>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-pill">
              <span /> Local-first
            </span>
            <button
              aria-label="Open due follow-ups"
              className="notification-button icon-button"
              onClick={() => navigate('Follow-ups')}
            >
              <Bell size={19} />
              {due.length > 0 && <i />}
            </button>
            <span className="user-avatar" title="Personal workspace">
              ME
            </span>
          </div>
        </header>
        <main>
          <div className="page-kicker">
            <span />
            {now.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <div className="page-heading">
            <div>
              <h1>{titles[page][0]}</h1>
              <p>{titles[page][1]}</p>
            </div>
            {pageAction ? (
              <button
                className="button primary"
                disabled={
                  !data.contacts.length && ['messages', 'reminders'].includes(pageAction[1])
                }
                onClick={() => setEditor({ type: pageAction[1] as Collection })}
              >
                <Plus size={17} />
                {pageAction[0]}
              </button>
            ) : (
              page === 'Overview' && (
                <button className="button primary" onClick={() => setEditor({ type: 'contacts' })}>
                  <Plus size={17} />
                  Add contact
                </button>
              )
            )}
          </div>
          {/* Recovery/conflict notices expose protected states; reset is explicit and destructive. */}
          {(error || recovery || conflict) && (
            <div className="banner danger" role="alert">
              <div>
                {recovery
                  ? 'Stored data could not be read. Editing is paused to protect it. Download the raw data before resetting.'
                  : conflict
                    ? 'This workspace changed in another tab. Reload before editing to avoid overwriting it.'
                    : error}
              </div>
              {recovery && (
                <>
                  <button
                    className="button secondary"
                    onClick={() =>
                      download(
                        'the-linked-list-recovery.json',
                        initial.raw ?? 'No readable data available.',
                      )
                    }
                  >
                    Download raw data
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => {
                      if (
                        confirm(
                          'Erase unreadable stored data and start empty? Download recovery data first.',
                        )
                      ) {
                        try {
                          localStorage.removeItem(STORAGE_KEY);
                          setRecovery(false);
                          setData(emptyWorkspace());
                          setError('');
                        } catch (err) {
                          setError(errorText(err));
                        }
                      }
                    }}
                  >
                    Reset storage
                  </button>
                </>
              )}
              {conflict && (
                <button className="button secondary" onClick={() => location.reload()}>
                  Reload workspace
                </button>
              )}
              {error && !recovery && !conflict && (
                <button
                  className="icon-button"
                  onClick={() => setError('')}
                  aria-label="Dismiss error"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          {notice && (
            <div className="banner success" role="status">
              <CheckCheck size={17} />
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="Dismiss notice"
                onClick={() => setNotice('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {/* OVERVIEW: derived metrics, exact weekly counts, nurture suggestions, tasks, and job previews. */}
          {page === 'Overview' && (
            <>
              <div className="stats-grid">
                {[
                  {
                    title: 'YOUR NETWORK',
                    value: data.contacts.length,
                    note: 'People worth staying close to',
                    icon: Users,
                    style: 'purple',
                  },
                  {
                    title: 'MESSAGES LOGGED',
                    value: data.messages.length,
                    note: 'Conversations that build connection',
                    icon: MessageSquare,
                    style: 'blue',
                  },
                  {
                    title: 'FOLLOW-UPS DUE',
                    value: due.length,
                    note: due.length ? 'A good day to say hello' : 'A little breathing room',
                    icon: Bell,
                    style: 'orange',
                  },
                  {
                    title: 'ACTIVE APPLICATIONS',
                    value: activeJobs.length,
                    note: 'Possibilities in progress',
                    icon: BriefcaseBusiness,
                    style: 'green',
                  },
                ].map((s) => (
                  <div className="stat-card" key={s.title}>
                    <div className="stat-top">
                      <span>{s.title}</span>
                      <span className={'stat-icon ' + s.style}>
                        <s.icon size={18} />
                      </span>
                    </div>
                    <strong className="stat-number">{s.value.toString().padStart(2, '0')}</strong>
                    <p>{s.note}</p>
                  </div>
                ))}
              </div>
              {!data.contacts.length && (
                <div className="welcome-card">
                  <span className="welcome-art">
                    <Link2 size={46} strokeWidth={1.2} />
                  </span>
                  <div>
                    <span className="eyebrow">A FRESH START</span>
                    <h2>Your next opportunity starts with a person.</h2>
                    <p>
                      Add your first contact, import your connections, or take a look around with
                      fictional demo data.
                    </p>
                  </div>
                  <div className="welcome-actions">
                    <button className="button primary" onClick={loadDemo}>
                      <Sparkles size={16} />
                      Load demo workspace
                    </button>
                    <button className="text-button" onClick={() => navigate('Data & settings')}>
                      Import your connections <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
              <div className="dashboard-grid">
                <section className="panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Conversations over time</h2>
                      <p>Small check-ins. Lasting connections.</p>
                    </div>
                    <span className="subtle-chip">Last 6 weeks</span>
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i className="outgoing-dot" />
                      Outgoing
                    </span>
                    <span>
                      <i className="incoming-dot" />
                      Incoming
                    </span>
                    <span className="chart-total">
                      {weeks.reduce((n, w) => n + w.incoming + w.outgoing, 0)}{' '}
                      <small>messages</small>
                    </span>
                  </div>
                  <div
                    className="chart"
                    role="img"
                    aria-label="Message activity over six Monday-start weeks. Exact incoming and outgoing counts below."
                  >
                    <div className="chart-grid">
                      <span>{maxWeek}</span>
                      <span>{Math.ceil(maxWeek / 2)}</span>
                      <span>0</span>
                    </div>
                    {weeks.map((w, i) => (
                      <div className="chart-column" key={i}>
                        <div className="bar-area">
                          <div
                            className="bar outgoing-bar"
                            style={{ height: `${(w.outgoing / maxWeek) * 100}%` }}
                          />
                          <div
                            className="bar incoming-bar"
                            style={{ height: `${(w.incoming / maxWeek) * 100}%` }}
                          />
                        </div>
                        <span>{w.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="chart-accessible">
                    {weeks.map((w, i) => (
                      <span key={i}>
                        {w.label}: {w.outgoing} out · {w.incoming} in
                      </span>
                    ))}
                  </div>
                  <div className="panel-footer">
                    <span>
                      <span className="tiny-dot" /> Only the messages you’ve logged. This week is
                      partial.
                    </span>
                    <button className="text-button" onClick={() => navigate('Messages')}>
                      View messages <ArrowRight size={14} />
                    </button>
                  </div>
                </section>
                <section className="panel nurture-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow orange-text">A LITTLE NUDGE</span>
                      <h2>Keep the connection warm</h2>
                    </div>
                    <Flower2 size={26} className="orange-text" strokeWidth={1.2} />
                  </div>
                  <p className="section-description">
                    A few people who might be happy to hear from you.
                  </p>
                  {needsLove.length ? (
                    needsLove.slice(0, 3).map(({ contact, reason }, i) => (
                      <div className="nurture-row" key={contact.id}>
                        <Avatar name={contact.name} index={i} />
                        <div className="grow">
                          <button
                            className="text-button row-title"
                            onClick={() => setSelected(contact.id)}
                          >
                            {contact.name}
                          </button>
                          <p>
                            {contact.role}
                            {contact.company && ' · ' + contact.company}
                          </p>
                          <small>{reason}</small>
                        </div>
                        <button
                          className="icon-button outlined"
                          aria-label={'Plan follow-up with ' + contact.name}
                          onClick={() => addReminder(contact.id)}
                        >
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <Empty
                      title={
                        data.contacts.length
                          ? 'You’re in a good rhythm.'
                          : 'Make your first connection.'
                      }
                      text={
                        data.contacts.length
                          ? 'Your logged interactions are within your chosen intervals.'
                          : 'Add people to see thoughtful follow-up suggestions.'
                      }
                    />
                  )}
                  <div className="nurture-bottom">
                    <CircleHelp size={14} />
                    <span>Based on logged interactions and your chosen intervals.</span>
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        A thoughtful to-do list{' '}
                        <span className="count-label">{upcoming.length}</span>
                      </h2>
                      <p>Make a little time for your people.</p>
                    </div>
                    <button className="text-button" onClick={() => navigate('Follow-ups')}>
                      View all <ArrowRight size={14} />
                    </button>
                  </div>
                  {upcoming.length ? (
                    upcoming.slice(0, 3).map(reminderRow)
                  ) : (
                    <Empty
                      title="Nothing on your list yet."
                      text="Plan a check-in and keep a draft ready."
                    />
                  )}
                  <button
                    className="panel-add"
                    disabled={!data.contacts.length}
                    onClick={() => setEditor({ type: 'reminders' })}
                  >
                    <Plus size={15} />
                    Plan a follow-up
                  </button>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Opportunities in motion</h2>
                      <p>Your next chapter is taking shape.</p>
                    </div>
                    <button className="text-button" onClick={() => navigate('Applications')}>
                      View pipeline <ArrowRight size={14} />
                    </button>
                  </div>
                  {data.jobs.length ? (
                    data.jobs.slice(0, 3).map((j, i) => (
                      <div className="opportunity-row" key={j.id}>
                        <span className={`company-avatar color-${i % 5}`}>{j.company[0]}</span>
                        <div className="grow">
                          <button
                            className="text-button row-title"
                            onClick={() => setEditor({ type: 'jobs', value: j })}
                          >
                            {j.role}
                          </button>
                          <p>
                            {j.company} <span className="dot">·</span> {j.kind}
                          </p>
                        </div>
                        <span
                          className={
                            'badge ' +
                            (j.status === 'Interviewing'
                              ? 'purple'
                              : j.status === 'Applied'
                                ? 'blue'
                                : '')
                          }
                        >
                          {j.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <Empty
                      title="Something good is ahead."
                      text="Save a role you’re excited about to start your pipeline."
                    />
                  )}
                  <div className="panel-footer">
                    <span>Your plans, at your own pace.</span>
                    <Flower2 size={16} />
                  </div>
                </section>
              </div>
              <div className="bottom-quote">
                “The best way to grow your network? Take care of the one you have.”
                <span>A SMALL REMINDER FROM THE LINKED LIST</span>
              </div>
            </>
          )}
          {/* Controlled search input: value comes from query, and onChange updates that React state. */}
          {['Network', 'Messages', 'Follow-ups', 'Applications'].includes(page) && (
            <div className="toolbar">
              <label className="search-box">
                <Search size={17} />
                <input
                  aria-label={'Search ' + page.toLowerCase()}
                  placeholder={
                    page === 'Network'
                      ? 'Find a person, company, or tag...'
                      : 'Search ' + page.toLowerCase() + '...'
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {page === 'Network' ? (
                <span className="muted">
                  {
                    data.contacts.filter((c) =>
                      matches(c.name, c.company, c.role, c.tags.join(' ')),
                    ).length
                  }{' '}
                  people in your corner
                </span>
              ) : page === 'Applications' ? (
                <select
                  aria-label="Filter applications by stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                >
                  <option>All stages</option>
                  {stages.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <span className="muted">
                  {page === 'Messages'
                    ? 'Log real conversations, not drafts.'
                    : 'In-app reminders · no automatic sending'}
                </span>
              )}
            </div>
          )}
          {/* NETWORK: filter before rendering; each card references its stable contact ID. */}
          {page === 'Network' && (
            <>
              <div className="contact-grid">
                {data.contacts
                  .filter((c) => matches(c.name, c.company, c.role, c.tags.join(' ')))
                  .map((c, i) => {
                    const n = nurture(c, data.messages, now);
                    return (
                      <article className="panel contact-card" key={c.id}>
                        <div className="contact-card-top">
                          <Avatar name={c.name} index={i} />
                          <button
                            className="icon-button"
                            aria-label={'Edit ' + c.name}
                            onClick={() => setEditor({ type: 'contacts', value: c })}
                          >
                            <MoreHorizontal size={19} />
                          </button>
                        </div>
                        <button
                          className="text-button contact-name"
                          onClick={() => setSelected(c.id)}
                        >
                          {c.name}
                        </button>
                        <p>{c.role || 'Your connection'}</p>
                        <p className="contact-company">{c.company || 'Company not added'}</p>
                        <div className="tags">
                          {c.tags.map((t, k) => (
                            <span className="tag" key={k}>
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="contact-card-bottom">
                          <span className={'badge ' + (n.due ? 'orange' : 'green')}>
                            {n.last === null
                              ? 'No messages yet'
                              : n.due
                                ? 'Time to reconnect'
                                : 'In a good rhythm'}
                          </span>
                          <button
                            className="icon-button"
                            aria-label={'Follow up with ' + c.name}
                            onClick={() => addReminder(c.id)}
                          >
                            <Bell size={16} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
              </div>
              {!data.contacts.filter((c) => matches(c.name, c.company, c.role, c.tags.join(' ')))
                .length && (
                <Empty
                  title={query ? 'No matching people.' : 'Your people belong here.'}
                  text={
                    query
                      ? 'Try another name, company, role, or tag.'
                      : 'Add your first contact or import a connections file.'
                  }
                >
                  <button className="button secondary" onClick={() => navigate('Data & settings')}>
                    Import connections <Upload size={15} />
                  </button>
                </Empty>
              )}
            </>
          )}
          {/* MESSAGES: newest actual conversations first. React escapes message text rather than executing HTML. */}
          {page === 'Messages' && (
            <section className="panel">
              {data.messages
                .filter((m) => matches(person(m.contactId)?.name ?? '', m.body, m.direction))
                .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
                .map((m) => (
                  <article className="message-row" key={m.id}>
                    <Avatar name={person(m.contactId)?.name ?? '?'} />
                    <div className="grow">
                      <div className="message-top">
                        <button
                          className="text-button row-title"
                          onClick={() => setSelected(m.contactId)}
                        >
                          {person(m.contactId)?.name}
                        </button>
                        <span
                          className={'badge ' + (m.direction === 'outgoing' ? 'orange' : 'green')}
                        >
                          {m.direction === 'outgoing' ? (
                            <ArrowUpRight size={12} />
                          ) : (
                            <ArrowDownLeft size={12} />
                          )}{' '}
                          {m.direction}
                        </span>
                        <time>{formatDate(m.at)}</time>
                      </div>
                      <p className="message-body">{m.body}</p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={'Delete message from ' + formatDate(m.at)}
                      onClick={() => remove('messages', m.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              {!data.messages.filter((m) =>
                matches(person(m.contactId)?.name ?? '', m.body, m.direction),
              ).length && (
                <Empty
                  title="Every conversation starts somewhere."
                  text={
                    data.contacts.length
                      ? 'Log a sent or received message to start your history.'
                      : 'Add a contact in Network, then log your first message.'
                  }
                />
              )}
            </section>
          )}
          {/* FOLLOW-UPS: editable tasks plus explained interval suggestions, without sending messages. */}
          {page === 'Follow-ups' && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>On your list</h2>
                    <p>
                      {due.length} due · {upcoming.length} open · completing a task doesn’t log a
                      message
                    </p>
                  </div>
                  <Bell size={19} className="muted" />
                </div>
                {data.reminders
                  .filter((r) => matches(r.title, r.draft, person(r.contactId)?.name ?? ''))
                  .sort(
                    (a, b) =>
                      Number(a.done) - Number(b.done) || Date.parse(a.dueAt) - Date.parse(b.dueAt),
                  )
                  .map(reminderRow)}
                {!data.reminders.filter((r) =>
                  matches(r.title, r.draft, person(r.contactId)?.name ?? ''),
                ).length && (
                  <Empty
                    title="A little planning goes a long way."
                    text={
                      data.contacts.length
                        ? 'Create a reminder with a draft you can send yourself.'
                        : 'Add a contact first, then plan your next hello.'
                    }
                  />
                )}
              </section>
              <section className="panel space-top">
                <div className="panel-heading">
                  <div>
                    <h2>Worth reconnecting</h2>
                    <p>Transparent suggestions, based on your own follow-up intervals.</p>
                  </div>
                  <Flower2 size={22} />
                </div>
                {needsLove.map(({ contact, reason }) => (
                  <div className="nurture-row" key={contact.id}>
                    <Avatar name={contact.name} />
                    <div className="grow">
                      <strong>{contact.name}</strong>
                      <p>{reason}</p>
                    </div>
                    <button className="button secondary" onClick={() => addReminder(contact.id)}>
                      Plan a hello <Plus size={14} />
                    </button>
                  </div>
                ))}
                {!needsLove.length && (
                  <p className="section-description">
                    No suggestions right now. Your logged interactions are within your chosen
                    intervals.
                  </p>
                )}
              </section>
            </>
          )}
          {/* APPLICATIONS: stage controls update current status; this MVP does not record stage history. */}
          {page === 'Applications' && (
            <>
              <div className="pipeline-summary">
                {stages.map((s) => (
                  <button
                    key={s}
                    className={stage === s ? 'selected' : ''}
                    onClick={() => setStage(stage === s ? 'All stages' : s)}
                  >
                    <span>{s}</span>
                    <strong>{data.jobs.filter((j) => j.status === s).length}</strong>
                  </button>
                ))}
              </div>
              <div className="job-grid">
                {data.jobs
                  .filter(
                    (j) =>
                      (stage === 'All stages' || j.status === stage) &&
                      matches(j.company, j.role, j.kind, j.notes),
                  )
                  .map((j, i) => (
                    <article className="panel job-card" key={j.id}>
                      <div className="contact-card-top">
                        <span className={`company-avatar color-${i % 5}`}>{j.company[0]}</span>
                        <span className="badge">{j.kind}</span>
                      </div>
                      <h3>{j.role}</h3>
                      <p>{j.company}</p>
                      {j.deadline && (
                        <p className="help-text">
                          Deadline: {new Date(j.deadline + 'T12:00:00').toLocaleDateString()}
                        </p>
                      )}
                      {j.contactId && (
                        <p className="help-text">Connection: {person(j.contactId)?.name}</p>
                      )}
                      <p className="job-notes">
                        {j.notes || 'A new possibility. Add a few notes as you learn more.'}
                      </p>
                      <Field label={'Stage for ' + j.company + ' ' + j.role}>
                        <select
                          value={j.status}
                          onChange={(e) =>
                            save('jobs', { ...j, status: e.target.value as Job['status'] })
                          }
                        >
                          {stages.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </Field>
                      <div className="job-actions">
                        <button
                          className="text-button"
                          onClick={() => setEditor({ type: 'jobs', value: j })}
                        >
                          Edit details <ArrowRight size={14} />
                        </button>
                        {j.url && (
                          <a
                            className="icon-button"
                            aria-label={'Open posting at ' + j.company}
                            href={j.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                        <button
                          className="icon-button"
                          aria-label={'Delete application at ' + j.company}
                          onClick={() => remove('jobs', j.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
              {!data.jobs.filter(
                (j) =>
                  (stage === 'All stages' || j.status === stage) &&
                  matches(j.company, j.role, j.kind, j.notes),
              ).length && (
                <Empty
                  title="Make space for what’s next."
                  text="Save an internship or job, then move it through your own pipeline."
                />
              )}
            </>
          )}
          {/* DATA TOOLS: user-selected local files, explicit backups, opt-in demo, and confirmed reset. */}
          {page === 'Data & settings' && (
            <>
              <div className="data-intro">
                <ShieldCheck size={24} />
                <div>
                  <h2>A place for your network, without handing it over.</h2>
                  <p>
                    Your contacts and conversations live in this browser. No accounts, tracking, or
                    LinkedIn automation. Backups are your responsibility.
                  </p>
                </div>
              </div>
              <div className="data-grid">
                <section className="panel data-card">
                  <span className="feature-icon orange">
                    <Upload size={24} />
                  </span>
                  <h2>Bring your connections</h2>
                  <p>
                    Import the Connections.csv file from your own LinkedIn data export. Preview the
                    results before anything is saved.
                  </p>
                  <ul>
                    <li>Names, roles, companies and profile links</li>
                    <li>Duplicates detected by email or profile URL</li>
                    <li>Existing contact notes stay intact</li>
                  </ul>
                  <label className="button primary file-button">
                    <Upload size={16} />
                    Import connections
                    <input
                      aria-label="Import connections CSV"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        void fileChange(e.target.files?.[0], 'csv');
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <a className="text-button" href="/example-connections.csv" download>
                    Download fictional example <Download size={14} />
                  </a>
                  <p className="help-text">
                    English column headers · UTF-8 CSV · up to 2 MiB. Records without email or
                    profile URL cannot be reliably deduplicated. Message archives are not supported.
                  </p>
                  <a
                    href="https://www.linkedin.com/help/linkedin/answer/a566336"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-button"
                  >
                    How to export from LinkedIn <ExternalLink size={13} />
                  </a>
                </section>
                <section className="panel data-card">
                  <span className="feature-icon green">
                    <Download size={24} />
                  </span>
                  <h2>A backup for peace of mind</h2>
                  <p>
                    Download a complete, versioned JSON snapshot of your contacts, messages,
                    reminders, and applications.
                  </p>
                  <div className="backup-counts">
                    <span>
                      <strong>{data.contacts.length}</strong> contacts
                    </span>
                    <span>
                      <strong>{data.messages.length}</strong> messages
                    </span>
                    <span>
                      <strong>{data.reminders.length}</strong> reminders
                    </span>
                    <span>
                      <strong>{data.jobs.length}</strong> applications
                    </span>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() =>
                      download(
                        'the-linked-list-backup-' + new Date().toISOString().slice(0, 10) + '.json',
                        JSON.stringify(data, null, 2),
                      )
                    }
                  >
                    <Download size={16} />
                    Export backup
                  </button>
                  <label className="button secondary file-button">
                    <Upload size={16} />
                    Restore JSON backup
                    <input
                      aria-label="Restore JSON backup"
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => {
                        void fileChange(e.target.files?.[0], 'json');
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <p className="help-text">
                    Backups contain readable private information. Store them somewhere safe. Restore
                    replaces this entire workspace after confirmation.
                  </p>
                </section>
              </div>
              <section className="panel workspace-tools">
                <div>
                  <h2>A fresh start, when you need one.</h2>
                  <p>
                    Explore fictional examples, or clear this browser’s workspace. Export your
                    backup first.
                  </p>
                </div>
                <div className="tools-actions">
                  <button className="button secondary" onClick={loadDemo}>
                    <Sparkles size={16} />
                    Load demo workspace
                  </button>
                  <button
                    className="button danger-button"
                    onClick={() => {
                      if (
                        confirm(
                          'Permanently clear ALL contacts, messages, reminders and applications in this browser workspace? Export a backup first.',
                        )
                      )
                        commit(emptyWorkspace(), 'Workspace cleared. A fresh start.');
                    }}
                  >
                    <Trash2 size={16} />
                    Clear workspace
                  </button>
                </div>
              </section>
              <p className="settings-footer">
                The Linked List · MVP 1.0 · Local browser storage · No API keys required
                <br />
                Use one editing tab. No background reminders or device sync. See the included docs
                for architecture, evidence, reproduction, and limitations.
              </p>
            </>
          )}
          <footer className="app-footer">
            <span className="footer-brand">
              <Link2 size={14} /> the linked list.
            </span>
            <span>Less keeping tabs. More keeping in touch.</span>
            <span>
              Made for your next chapter <Flower2 size={13} />
            </span>
          </footer>
        </main>
      </div>
      {/* A new key remounts the editor when the record/type changes, resetting its native defaults. */}
      {editor && (
        <EditorForm
          key={editor.type + (editor.value?.id ?? '')}
          editor={editor}
          data={data}
          save={save}
          errorDetail={error}
          close={() => setEditor(null)}
        />
      )}
      {/* Profile view yields to the editor so both native dialogs are not open together. */}
      {activePerson && !editor && (
        <Modal title={activePerson.name} close={() => setSelected(null)} wide>
          <div className="profile-intro">
            <Avatar name={activePerson.name} />
            <div>
              <p>
                {activePerson.role}
                {activePerson.company && ' · ' + activePerson.company}
              </p>
              <p className="help-text">{nurture(activePerson, data.messages, now).reason}</p>
            </div>
          </div>
          <div className="tags">
            {activePerson.tags.map((t, i) => (
              <span className="tag" key={i}>
                {t}
              </span>
            ))}
          </div>
          {activePerson.email && <p className="profile-notes">{activePerson.email}</p>}
          {activePerson.linkedin && (
            <a
              href={activePerson.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-button"
            >
              Open LinkedIn profile <ExternalLink size={14} />
            </a>
          )}
          <p className="profile-notes">
            {activePerson.notes || 'No notes yet. Add a little context for your next conversation.'}
          </p>
          <h3 className="section-label">Conversation history</h3>
          <div className="profile-history">
            {data.messages
              .filter((m) => m.contactId === activePerson.id)
              .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
              .map((m) => (
                <div key={m.id}>
                  <span className="badge">{m.direction}</span>
                  <time>{formatDate(m.at)}</time>
                  <p>{m.body}</p>
                </div>
              ))}
            {!data.messages.some((m) => m.contactId === activePerson.id) && (
              <p className="muted">No messages logged yet.</p>
            )}
          </div>
          <div className="profile-actions">
            <button
              className="button secondary"
              onClick={() => {
                setSelected(null);
                setEditor({ type: 'contacts', value: activePerson });
              }}
            >
              Edit contact
            </button>
            <button
              className="button primary"
              onClick={() => {
                setSelected(null);
                setEditor({ type: 'messages', contactId: activePerson.id });
              }}
            >
              Log message
            </button>
            <button
              className="icon-button delete-profile"
              aria-label="Delete contact"
              onClick={() => remove('contacts', activePerson.id)}
            >
              <Trash2 size={17} />
            </button>
          </div>
        </Modal>
      )}
      {/* CSV preview mutates data only through its explicit Import contacts commit action. */}
      {csv && (
        <Modal title="Preview your connections" close={() => setCsv(null)}>
          <p className="section-description">
            Nothing has been saved yet. Existing notes and profiles will not be overwritten.
          </p>
          <div className="preview-stats">
            <span>
              <strong>{csv.contacts.length}</strong> ready to add
            </span>
            <span>
              <strong>{csv.duplicates}</strong> duplicates
            </span>
            <span>
              <strong>{csv.invalid}</strong> invalid rows
            </span>
          </div>
          {csv.contacts.slice(0, 5).map((c) => (
            <p className="preview-person" key={c.id}>
              {c.name}
              <small>{c.company || c.role || 'No company provided'}</small>
            </p>
          ))}
          {csv.contacts.length > 5 && (
            <p className="muted">And {csv.contacts.length - 5} more contacts.</p>
          )}
          <p className="help-text">
            Name-only records have no stable identity and may duplicate on reimport. {csv.total}{' '}
            rows inspected.
          </p>
          <div className="modal-actions">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button secondary" onClick={() => setCsv(null)}>
              Cancel
            </button>
            <button
              className="button primary"
              disabled={!csv.contacts.length}
              onClick={() => {
                if (
                  commit(
                    { ...data, contacts: [...data.contacts, ...csv.contacts] },
                    `${csv.contacts.length} contacts imported.`,
                  )
                )
                  setCsv(null);
              }}
            >
              Import contacts
            </button>
          </div>
        </Modal>
      )}
      {/* Restore replaces the entire snapshot after confirmation; it does not merge collections. */}
      {restore && (
        <Modal title="Replace this workspace?" close={() => setRestore(null)}>
          <p className="section-description">
            This validated backup will replace all current records. Export your current workspace
            first if you want to keep it. This is not a merge.
          </p>
          <div className="preview-stats">
            {(['contacts', 'messages', 'reminders', 'jobs'] as const).map((key) => (
              <span key={key}>
                <strong>{restore[key].length}</strong>
                {key}
              </span>
            ))}
          </div>
          <div className="modal-actions">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button secondary" onClick={() => setRestore(null)}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                if (commit(restore, 'Backup restored.')) setRestore(null);
              }}
            >
              Confirm restore
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
