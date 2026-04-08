import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { updateProspectContacts, Contact } from '@/lib/db';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Pages to try fetching for contact info
const CONTACT_PATHS = ['', '/contact', '/contact-us', '/about', '/about-us', '/team', '/our-team', '/people'];

// Extract emails from raw HTML/text
function extractEmails(text: string): string[] {
  const regex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const found = text.match(regex) || [];
  // Filter out common false positives
  return [...new Set(found)].filter(e =>
    !e.endsWith('.png') && !e.endsWith('.jpg') &&
    !e.includes('example.com') && !e.includes('yourdomain') &&
    !e.includes('email@') && !e.includes('@email') &&
    !e.startsWith('email@') && e.length < 80
  );
}

// Strip HTML tags, collapse whitespace
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function fetchPage(url: string): Promise<{ text: string; html: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return { html, text: stripHtml(html) };
  } catch {
    return null;
  }
}

function buildBaseUrl(website: string): string {
  try {
    const u = new URL(website.startsWith('http') ? website : `https://${website}`);
    return u.origin;
  } catch {
    return `https://${website}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prospectId, website, company } = body;

    if (!website && !company) {
      return NextResponse.json({ error: 'website or company required' }, { status: 400 });
    }

    const base = buildBaseUrl(website || `${company.toLowerCase().replace(/\s+/g, '')}.com`);

    // Fetch multiple pages in parallel
    const pages = await Promise.all(
      CONTACT_PATHS.map(p => fetchPage(`${base}${p}`))
    );

    const validPages = pages.filter(Boolean) as { text: string; html: string }[];

    if (validPages.length === 0) {
      return NextResponse.json({
        contacts: [],
        message: 'Could not reach the website. Check the URL and try again.',
      });
    }

    // Collect all emails from raw HTML (most reliable)
    const allEmails: string[] = [];
    for (const page of validPages) {
      allEmails.push(...extractEmails(page.html));
    }
    const uniqueEmails = [...new Set(allEmails)];

    // Build combined text for Claude (capped to avoid token explosion)
    const combinedText = validPages
      .map(p => p.text)
      .join('\n\n---\n\n')
      .slice(0, 12000);

    // Use Claude to extract structured contacts from page text
    const prompt = `You are extracting contact information from the website of "${company}".

Here is the scraped text from their website (homepage, /contact, /about, /team pages):

---
${combinedText}
---

Also, these email addresses were found in the raw HTML: ${uniqueEmails.length ? uniqueEmails.join(', ') : 'none'}

Extract all real people and contacts you can identify. For each, return:
- name (if visible)
- role / job title (if visible)
- email (if present or can be matched to the name)
- phone (if present)
- linkedin (if present, just the URL)
- source (which page type: "homepage", "contact page", "about page", "team page")

If only emails are found with no names, still include them as contacts with name: null.

Return a JSON array. If nothing useful found, return [].
Example: [{"name":"Jane Smith","role":"Head of Marketing","email":"jane@company.com","phone":null,"linkedin":null,"source":"team page"}]

Return ONLY the JSON array, no other text.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected AI response');

    let contacts: Contact[] = [];
    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      contacts = JSON.parse(jsonMatch ? jsonMatch[0] : content.text);
      if (!Array.isArray(contacts)) contacts = [];
    } catch {
      // Fallback: just use raw emails
      contacts = uniqueEmails.map(email => ({ email, source: 'website' }));
    }

    // Merge any emails found by regex that Claude may have missed
    const claudeEmails = new Set(contacts.map(c => c.email?.toLowerCase()).filter(Boolean));
    for (const email of uniqueEmails) {
      if (!claudeEmails.has(email.toLowerCase())) {
        contacts.push({ email, source: 'website (regex)' });
      }
    }

    // Save to DB if prospectId provided
    if (prospectId) {
      updateProspectContacts(Number(prospectId), contacts);
    }

    return NextResponse.json({ contacts, emailsFound: uniqueEmails });
  } catch (error) {
    console.error('Scrape contacts error:', error);
    return NextResponse.json({ error: 'Failed to scrape contacts' }, { status: 500 });
  }
}
