import { NextRequest, NextResponse } from 'next/server';
import { getProspectById, updateProspectStatus, ProspectStatus } from '@/lib/db';

const VALID_STATUSES: ProspectStatus[] = ['New', 'Contacted', 'Replied', 'Closed'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prospect = getProspectById(Number(id));
  if (!prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  }
  return NextResponse.json({ prospect });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const prospect = updateProspectStatus(Number(id), status);
  if (!prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  }
  return NextResponse.json({ prospect });
}
