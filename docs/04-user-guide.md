# User guide

## First launch

The workspace starts empty. Load demo workspace only when empty to explore fictional data without mixing it with personal records. To replace an existing workspace with demo content, export first and clear explicitly. Navigation includes Overview, Network, Messages, Follow-ups, Applications, Data & settings. Data is saved per browser origin, not to your LinkedIn account.

## Contacts

Network -> Add contact. Name is required; company, role, email, profile link, notes and comma-separated tags are optional. Set your follow-up interval. Search matches name/company/role/tags; open a contact to see editable details and message history. Delete asks for confirmation and cascades linked messages/reminders; linked jobs remain with their contact association cleared. A duplicate manual stable identity is rejected rather than silently merged.

## Connections.csv

Use LinkedIn's own Settings & Privacy -> Data privacy -> Get a copy of your data export flow; current official steps are linked in the decision register. Select Connections.csv from the archive; do not upload the ZIP. Data & settings -> Import connections. Files stay in the browser.

Supported headers, case-insensitive and trimmed: `First Name`, `Last Name`, `URL`, `Email Address`, `Company`, `Position`, `Connected On`. First/last name columns are required; at least one name value per row is required. Other columns are optional. The adapter tolerates a LinkedIn explanatory preamble by finding the header record. Connected On is not interpreted as message history or stored as a guessed date. A UTF-8 BOM is stripped. Commas/newlines within quoted fields and CRLF are parsed by Papa Parse. Unexpected CSV syntax errors reject the file.

Preview shows added candidate count, duplicate count, skipped invalid rows, and first candidate names. Nothing persists until Import contacts. Missing emails are normal in LinkedIn exports. Duplicate detection compares supplied profile URL/email keys. It does not merge by name. Reimport without stable identifiers can duplicate people: inspect the preview, cancel if needed, and clean the source or edit manually. Rows with invalid email/profile URL or excessive lengths are skipped and counted. Max file size 2 MiB, max stored contacts 2,000.

## Messages and activity

Messages -> Log message. Pick contact, incoming/outgoing, timestamp and content. Future timestamps are rejected because a draft is not a sent message. View logs or filter using search. Delete an incorrect message to correct the history; editing is not included in MVP. Overview's six weekly bars derive only from actual logs. Incoming/outgoing messages both reset the contact's nurture clock. No full LinkedIn message archive import is claimed.

## Follow-ups

Add a dated reminder, contact, short title and optional draft. Edit before acting. “Mark done” completes the task; it does not log a sent message. Reopen if needed. Copy/use your draft manually on LinkedIn, then log the actual message in Messages. Overview lists due tasks and nurturing suggestions. No-message contacts are labeled; other contacts show days since interaction and your interval. The clock refreshes once a minute while the app is open. Past reminders are allowed to capture overdue work. No emails or desktop notifications are sent.

## Applications

Add a Job or Internship with company and role. Optional URL, deadline, contact and notes support research/interview preparation. Move stage with the labeled select on a card, or edit the whole record. Supported stages: Wishlist, Applied, Interviewing, Offer, Rejected, Withdrawn. Stages are editable in either direction for corrections. Stage history and application timestamps are not recorded, so the app cannot calculate time-in-stage. Delete requires confirmation.

## Backups and reset

Data & settings -> Export backup downloads full plaintext JSON including messages and notes. Store privately. Restore JSON validates the entire file before showing counts; Confirm restore replaces the workspace. Export first to preserve newer records. Unsupported version, malformed JSON, duplicate IDs, invalid dates, or dangling contact references leave current state unchanged. Restore is not a merge. Clear workspace has an explicit browser confirmation and removes every record at this origin. Recovery mode offers download of unreadable raw stored content before reset. Imported text is never executed as markup.

## Keyboard and accessibility

Use Tab/Shift+Tab, visible focus outlines and Enter/Space on buttons. Form fields have visible labels. Modal dialogs use native focus containment and Escape dismissal; clicking Cancel discards changes. Destructive confirmations use browser-native confirmation UI. Chart counts are written as text. Responsive navigation and controls remain available on narrow screens. Automated checks do not constitute a complete accessibility audit.
