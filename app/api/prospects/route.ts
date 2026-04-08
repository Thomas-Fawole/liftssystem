import { NextResponse } from 'next/server';
import { getAllProspects } from '@/lib/db';

export async function GET() {
  try {
    const prospects = getAllProspects();
    return NextResponse.json({ prospects });
  } catch (error) {
    console.error('Get prospects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
