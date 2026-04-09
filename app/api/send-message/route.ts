import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailer';
import { sendSms } from '@/lib/sms';
import { sendInstagramDm } from '@/lib/instagram';
import { createMessage, updateProspectStatus } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prospectId, channel, recipient, subject, message, markAsContacted } = body;

    if (!prospectId || !channel || !recipient || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sentAt = new Date().toISOString();
    let status: 'sent' | 'failed' = 'sent';
    let error: string | null = null;

    try {
      if (channel === 'email') {
        await sendEmail({ to: recipient, subject: subject || 'Introduction from Lifts Media', text: message });
      } else if (channel === 'sms') {
        await sendSms(recipient, message);
      } else if (channel === 'instagram') {
        await sendInstagramDm(recipient, message);
      } else {
        return NextResponse.json({ error: 'Channel must be "email", "sms", or "instagram"' }, { status: 400 });
      }
    } catch (err: unknown) {
      status = 'failed';
      error = err instanceof Error ? err.message : 'Send failed';
    }

    // Log to DB regardless of success/failure
    const saved = createMessage({
      prospect_id: Number(prospectId),
      channel,
      recipient,
      subject: subject || null,
      body: message,
      status,
      error,
      sent_at: sentAt,
    });

    // Auto-advance status to Contacted if send succeeded
    if (status === 'sent' && markAsContacted) {
      updateProspectStatus(Number(prospectId), 'Contacted');
    }

    if (status === 'failed') {
      return NextResponse.json({ error, message: saved }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: saved });
  } catch (err) {
    console.error('send-message error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
