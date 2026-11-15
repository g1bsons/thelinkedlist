/**
 * DEMO FIXTURES — fictional people, conversations, tasks, and opportunities.
 * App loads this only on request into an empty workspace. These examples are not
 * imported LinkedIn data, actual job openings, or measured product engagement.
 */
import { emptyWorkspace, uid, type Workspace } from './model';
/** Create a fresh demonstration snapshot with consistent contact references. */
export function demoWorkspace(): Workspace {
  const now = Date.now();
  // Positive days are in the past, negative days are in the future (used for reminders).
  const ago = (days: number) => new Date(now - days * 86400000).toISOString();
  const d = emptyWorkspace();
  // Compact tuples keep fixtures readable; the map below expands them into full Contact records.
  const people = [
    [
      'Sofia Martinez',
      'Product Designer',
      'Figma',
      'Design, Mentor',
      'Ask about her path from engineering to product design.',
      14,
    ],
    [
      'Ethan Brooks',
      'Software Engineer',
      'Linear',
      'Engineering, Alumni',
      'Met at the campus developer meetup. Interested in developer tools.',
      21,
    ],
    [
      'Maya Patel',
      'University Recruiter',
      'Notion',
      'Recruiting',
      'Follow up on summer internship timeline.',
      14,
    ],
    [
      'Oliver Kim',
      'Engineering Manager',
      'Vercel',
      'Engineering, Mentor',
      'Shared helpful advice on building projects in public.',
      30,
    ],
    [
      'Amara Johnson',
      'CS Student',
      'State University',
      'Peer, Campus',
      'Pair on interview preparation next week.',
      14,
    ],
    [
      'Leo Wilson',
      'Frontend Developer',
      'Stripe',
      'Engineering, Alumni',
      'Talked about accessible data visualization.',
      30,
    ],
  ] as const;
  // Generate IDs first, then reference those same IDs from messages and reminders.
  d.contacts = people.map(([name, role, company, tags, notes, intervalDays]) => ({
    id: uid(),
    name,
    role,
    company,
    email: '',
    linkedin: '',
    tags: tags.split(', '),
    notes,
    intervalDays,
    createdAt: ago(70),
  }));
  const bodies = [
    'Thanks for sharing your perspective — it was great catching up!',
    'I enjoyed our conversation about your team. Would love to stay in touch.',
    'Absolutely! Happy to share what I learned. Let’s find a time next week.',
    'Your advice on my portfolio was really helpful. Here is a quick update.',
  ];
  // Deterministically vary message counts/directions over recent dates. This is seeded
  // display content, not a simulation or algorithm for estimating network quality.
  for (let week = 0; week < 6; week++)
    for (let n = 0; n < [4, 7, 5, 9, 6, 11][week]; n++) {
      const person = d.contacts[(n + week) % 6];
      d.messages.push({
        id: uid(),
        contactId: person.id,
        direction: n % 3 === 0 ? 'incoming' : 'outgoing',
        body: bodies[n % bodies.length],
        at: ago((5 - week) * 7 + (n % 5) + 0.2),
      });
    }
  // Leave two contacts quiet long enough to demonstrate transparent nurture suggestions.
  d.messages = d.messages.filter(
    (m) =>
      ![d.contacts[0].id, d.contacts[3].id].includes(m.contactId) ||
      Date.parse(m.at) < now - 35 * 86400000,
  );
  // One past-due task plus two future tasks demonstrate different reminder states.
  d.reminders = [
    {
      id: uid(),
      contactId: d.contacts[0].id,
      title: 'Catch up over a virtual coffee',
      dueAt: ago(0.05),
      draft:
        'Hi Sofia! I have been putting your portfolio advice into practice. Would you be up for a quick coffee chat next week?',
      done: false,
    },
    {
      id: uid(),
      contactId: d.contacts[2].id,
      title: 'Ask about summer internships',
      dueAt: ago(-1),
      draft:
        'Hi Maya! I wanted to check in on the summer engineering internship timeline. Thank you!',
      done: false,
    },
    {
      id: uid(),
      contactId: d.contacts[1].id,
      title: 'Share my latest project',
      dueAt: ago(-3),
      draft:
        'Hey Ethan, I just built a local-first networking CRM and thought you might find it interesting.',
      done: false,
    },
  ];
  // Include several current stages; empty URLs avoid pretending these are verified live postings.
  d.jobs = [
    ['Linear', 'Frontend Engineer Intern', 'Internship', 'Wishlist'],
    ['Notion', 'Software Engineering Intern', 'Internship', 'Applied'],
    ['Vercel', 'Frontend Engineer', 'Job', 'Interviewing'],
    ['Figma', 'Product Engineering Intern', 'Internship', 'Applied'],
    ['Stripe', 'Software Engineer, New Grad', 'Job', 'Wishlist'],
  ].map(([company, role, kind, status]) => ({
    id: uid(),
    company,
    role,
    kind: kind as 'Job' | 'Internship',
    status: status as Workspace['jobs'][number]['status'],
    url: '',
    deadline: '',
    contactId: '',
    notes: 'Fictional demo opportunity. Verify real openings on the company careers site.',
  }));
  return d;
}
