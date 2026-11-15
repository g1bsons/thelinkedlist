/**
 * END-TO-END TESTS — run with npm run test:e2e (Playwright + Chromium).
 * Use real DOM controls and browser storage to check complete user workflows.
 * Playwright gives each test a fresh isolated browser context by default; tabs
 * created within one test share that context so cross-tab behavior can be checked.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const key = 'the-linked-list:v1';
// Role/name locators follow the accessible UI instead of relying on fragile CSS class names.
const go = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
// Reuse a real form workflow, not a shortcut that injects a contact straight into storage.
async function addContact(page: Page, name = 'Alex Morgan') {
  await page.getByRole('button', { name: 'Add contact', exact: true }).click();
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Company', { exact: true }).fill('Acme');
  await page.getByLabel('Email', { exact: true }).fill('alex@example.com');
  await page.getByRole('button', { name: 'Save contact', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
// Each test starts at the app entry point; no test relies on another test having run first.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});
// Main happy path also verifies cancellation and the relational effects of confirmed deletion.
test('complete personal CRM lifecycle, persistence and contact cascade', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Load demo workspace' })).toBeVisible();
  await addContact(page);
  await go(page, 'Network');
  await page.getByRole('button', { name: 'Edit Alex Morgan' }).click();
  await page.getByLabel('Notes', { exact: true }).fill('Met at a meetup.');
  await page.getByRole('button', { name: 'Save contact' }).click();
  await page.getByLabel('Search network').fill('Acme');
  await expect(page.getByRole('button', { name: 'Alex Morgan', exact: true })).toBeVisible();
  await go(page, 'Messages');
  await page.getByRole('button', { name: 'Log message', exact: true }).click();
  await page.getByLabel('Contact *', { exact: true }).selectOption({ label: 'Alex Morgan' });
  await page.getByLabel('Message *', { exact: true }).fill('Thanks for the conversation.');
  await page.getByRole('dialog').getByRole('button', { name: 'Log message', exact: true }).click();
  await expect(page.getByText('Thanks for the conversation.')).toBeVisible();
  await go(page, 'Follow-ups');
  await page.getByRole('button', { name: 'Add reminder' }).click();
  await page.getByLabel('Contact *', { exact: true }).selectOption({ label: 'Alex Morgan' });
  await page.getByLabel('Reminder title').fill('Coffee next week');
  await page.getByLabel('Message draft').fill('Would love to catch up.');
  await page.getByRole('button', { name: 'Save reminder' }).click();
  await page.getByRole('button', { name: 'Mark done Coffee next week' }).click();
  await expect(page.getByRole('button', { name: 'Reopen Coffee next week' })).toBeVisible();
  await page.getByRole('button', { name: 'Reopen Coffee next week' }).click();
  await page.getByRole('button', { name: 'Coffee next week', exact: true }).click();
  await page.getByLabel('Reminder title').fill('Coffee tomorrow');
  await page.getByRole('button', { name: 'Save reminder' }).click();
  await go(page, 'Applications');
  await page.getByRole('button', { name: 'Add application' }).click();
  await page.getByLabel('Company *', { exact: true }).fill('Acme');
  await page.getByLabel('Role *', { exact: true }).fill('Engineer Intern');
  await page.getByLabel('Linked contact').selectOption({ label: 'Alex Morgan' });
  await page.getByRole('button', { name: 'Save application' }).click();
  await page.getByLabel('Stage for Acme Engineer Intern').selectOption('Interviewing');
  // Reload drops in-memory React state: the following assertions therefore check persistence.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A little connection' })).toBeVisible();
  // UI assertions plus stored snapshot checks distinguish displayed changes from actual saved changes.
  const saved = JSON.parse(await page.evaluate((k) => localStorage.getItem(k)!, key));
  expect(saved.jobs[0].status).toBe('Interviewing');
  expect(saved.messages).toHaveLength(1);
  expect(saved.reminders[0].done).toBe(false);
  expect(saved.contacts[0].notes).toBe('Met at a meetup.');
  await go(page, 'Network');
  await page.getByRole('button', { name: 'Alex Morgan', exact: true }).click();
  // Here dialog means a browser confirm event, not the HTML dialog component in the DOM.
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: 'Delete contact', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete contact', exact: true }).click();
  const after = JSON.parse(await page.evaluate((k) => localStorage.getItem(k)!, key));
  expect(after.contacts).toHaveLength(0);
  expect(after.messages).toHaveLength(0);
  expect(after.reminders).toHaveLength(0);
  expect(after.jobs[0].contactId).toBe('');
});
// A preview/cancel must not write, and an identical stable-key import must be idempotent.
test('CSV preview, cancellation, commit and reimport dedupe', async ({ page }) => {
  await go(page, 'Data & settings');
  const file = {
    name: 'connections.csv',
    mimeType: 'text/csv',
    buffer: readFileSync('public/example-connections.csv'),
  };
  await page.getByLabel('Import connections CSV').setInputFiles(file);
  await expect(page.getByRole('dialog')).toContainText('ready to add');
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBeNull();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByLabel('Import connections CSV').setInputFiles(file);
  await page.getByRole('button', { name: 'Import contacts', exact: true }).click();
  await page.getByLabel('Import connections CSV').setInputFiles(file);
  await expect(page.getByRole('button', { name: 'Import contacts', exact: true })).toBeDisabled();
  await expect(page.getByRole('dialog')).toContainText('2 duplicates');
  const state = JSON.parse(await page.evaluate((k) => localStorage.getItem(k)!, key));
  expect(state.contacts).toHaveLength(2);
});
// Test the actual downloaded file, then restore it; do not just compare two hand-built objects.
test('backup roundtrip and invalid restore leave live data intact', async ({ page }) => {
  await addContact(page);
  await go(page, 'Data & settings');
  // Subscribe BEFORE the click so a fast download event cannot be missed.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const filePath = await (await downloadPromise).path();
  expect(filePath).toBeTruthy();
  const backup = readFileSync(filePath!, 'utf8');
  await page.getByLabel('Restore JSON backup').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":99}'),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(
    JSON.stringify(JSON.parse(backup)),
  );
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Clear workspace', exact: true }).click();
  await page.getByLabel('Restore JSON backup').setInputFiles({
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup),
  });
  await expect(page.getByRole('dialog')).toContainText('Replace this workspace?');
  await page.getByRole('button', { name: 'Confirm restore' }).click();
  await go(page, 'Network');
  await expect(page.getByRole('button', { name: 'Alex Morgan', exact: true })).toBeVisible();
});
// Fault injection: corrupted persisted content must remain recoverable until explicit reset.
test('invalid stored JSON is protected until explicit recovery reset', async ({ page }) => {
  await page.evaluate((k) => localStorage.setItem(k, '{broken'), key);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Stored data could not be read');
  await page.getByRole('button', { name: 'Load demo workspace' }).click();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe('{broken');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Reset storage', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
// Simulate a quota failure in this isolated browser only; no actual disk needs to be filled.
test('failed storage saves preserve current state and show useful modal errors', async ({
  page,
}) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Add contact', exact: true }).click();
  await page.getByLabel('Full name').fill('Alex');
  await page.getByRole('button', { name: 'Save contact' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Quota exceeded');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBeNull();
});
// Tabs share an origin/storage area within a context, letting the storage event fire naturally.
test('cross-tab changes pause subsequent edits', async ({ page, context }) => {
  const other = await context.newPage();
  await other.goto('/');
  await addContact(other);
  await expect(page.getByRole('alert')).toContainText('changed in another tab');
  await page.getByRole('button', { name: 'Load demo workspace' }).click();
  const live = JSON.parse(await page.evaluate((k) => localStorage.getItem(k)!, key));
  expect(live.contacts).toHaveLength(1);
});
// Validate the real form-to-domain boundary and check errors are visible INSIDE the modal.
test('duplicate contacts and future messages are rejected inside their dialogs', async ({
  page,
}) => {
  await addContact(page);
  await page.getByRole('button', { name: 'Add contact', exact: true }).click();
  await page.getByLabel('Full name').fill('Same person');
  await page.getByLabel('Email', { exact: true }).fill('alex@example.com');
  await page.getByRole('button', { name: 'Save contact' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('already exists');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await go(page, 'Messages');
  await page.getByRole('button', { name: 'Log message', exact: true }).click();
  await page.getByLabel('Contact *', { exact: true }).selectOption({ label: 'Alex Morgan' });
  await page.getByLabel('Message *', { exact: true }).fill('Not sent yet');
  await page.getByLabel('Sent / received at').fill('2099-01-01T12:00');
  await page.getByRole('dialog').getByRole('button', { name: 'Log message' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('future');
});
// A layout/smoke check supplements business workflows; it is not a full accessibility audit.
test('demo screens have no runtime errors, no remote requests and no horizontal overflow on mobile', async ({
  page,
}) => {
  // Record unexpected application exceptions and outgoing requests while navigating demo screens.
  const errors: string[] = [];
  const remote: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (
      !r.url().startsWith('http://127.0.0.1:5173') &&
      !r.url().startsWith('data:') &&
      !r.url().startsWith('blob:')
    )
      remote.push(r.url());
  });
  await page.getByRole('button', { name: 'Load demo workspace', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.screenshot({ path: 'test-results/overview-desktop.png', fullPage: true });
  // Narrow viewport exercises the responsive CSS; the nav may scroll inside its own container.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of [
    'Overview',
    'Network',
    'Messages',
    'Follow-ups',
    'Applications',
    'Data & settings',
  ]) {
    await go(page, name);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await go(page, 'Network');
  await page.getByRole('button', { name: 'Add contact', exact: true }).click();
  // Verify a basic keyboard contract: dismiss the native modal and return focus to the opener.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add contact', exact: true })).toBeFocused();
  await go(page, 'Overview');
  await page.screenshot({ path: 'test-results/overview-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
  expect(remote).toEqual([]);
});
