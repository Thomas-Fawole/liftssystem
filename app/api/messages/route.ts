import { NextRequest, NextResponse } from 'next/server';
import { getMessagesByProspect } from '@/lib/db';

export async function GET(req: NextRequest) {
  const prospectId = req.nextUrl.searchParams.get('prospectId');
  if (!prospectId) return NextResponse.json({ error: 'prospectId required' }, { status: 400 });
  const messages = getMessagesByProspect(Number(prospectId));
  return NextResponse.json({ messages });
}
