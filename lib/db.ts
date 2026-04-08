import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'prospects.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS prospects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      industry TEXT NOT NULL,
      website TEXT,
      notes TEXT,
      channel TEXT NOT NULL,
      tone TEXT NOT NULL,
      lead_score INTEGER NOT NULL DEFAULT 0,
      pain_points TEXT NOT NULL DEFAULT '[]',
      outreach_message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'New',
      date_added TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      contacts TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect_id INTEGER NOT NULL,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent',
      error TEXT,
      sent_at TEXT NOT NULL,
      FOREIGN KEY (prospect_id) REFERENCES prospects(id)
    );
  `);

  // Migrations for existing DBs
  const cols = db.prepare("PRAGMA table_info(prospects)").all() as { name: string }[];
  if (!cols.find(c => c.name === 'contacts')) {
    db.exec("ALTER TABLE prospects ADD COLUMN contacts TEXT NOT NULL DEFAULT '[]'");
  }
}

export type ProspectStatus = 'New' | 'Contacted' | 'Replied' | 'Closed';

export interface Contact {
  name?: string;
  role?: string;
  email?: string;
  linkedin?: string;
  phone?: string;
  source?: string;
}

export interface Message {
  id: number;
  prospect_id: number;
  channel: 'email' | 'sms';
  recipient: string;
  subject: string | null;
  body: string;
  status: 'sent' | 'failed';
  error: string | null;
  sent_at: string;
}

export interface Prospect {
  id: number;
  company: string;
  industry: string;
  website: string | null;
  notes: string | null;
  channel: string;
  tone: string;
  lead_score: number;
  pain_points: string;
  outreach_message: string;
  status: ProspectStatus;
  date_added: string;
  created_at: number;
  contacts: string;
}

export interface CreateProspectInput {
  company: string;
  industry: string;
  website?: string;
  notes?: string;
  channel: string;
  tone: string;
  lead_score: number;
  pain_points: string[];
  outreach_message: string;
}

export function getAllProspects(): Prospect[] {
  return getDb().prepare('SELECT * FROM prospects ORDER BY created_at DESC').all() as Prospect[];
}

export function getProspectById(id: number): Prospect | undefined {
  return getDb().prepare('SELECT * FROM prospects WHERE id = ?').get(id) as Prospect | undefined;
}

export function createProspect(input: CreateProspectInput): Prospect {
  const db = getDb();
  const now = new Date().toISOString().split('T')[0];
  const result = db.prepare(`
    INSERT INTO prospects (company, industry, website, notes, channel, tone, lead_score, pain_points, outreach_message, status, date_added, contacts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, '[]')
  `).run(
    input.company, input.industry, input.website || null, input.notes || null,
    input.channel, input.tone, input.lead_score,
    JSON.stringify(input.pain_points), input.outreach_message, now
  );
  return getProspectById(result.lastInsertRowid as number)!;
}

export function updateProspectStatus(id: number, status: ProspectStatus): Prospect | undefined {
  getDb().prepare('UPDATE prospects SET status = ? WHERE id = ?').run(status, id);
  return getProspectById(id);
}

export function updateProspectContacts(id: number, contacts: Contact[]): Prospect | undefined {
  getDb().prepare('UPDATE prospects SET contacts = ? WHERE id = ?').run(JSON.stringify(contacts), id);
  return getProspectById(id);
}

export function getMessagesByProspect(prospectId: number): Message[] {
  return getDb().prepare('SELECT * FROM messages WHERE prospect_id = ? ORDER BY sent_at DESC').all(prospectId) as Message[];
}

export function createMessage(input: Omit<Message, 'id'>): Message {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO messages (prospect_id, channel, recipient, subject, body, status, error, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.prospect_id, input.channel, input.recipient,
    input.subject || null, input.body, input.status,
    input.error || null, input.sent_at
  );
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid) as Message;
}
