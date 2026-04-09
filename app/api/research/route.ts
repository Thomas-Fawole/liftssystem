import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createProspect } from '@/lib/db';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const INSTAGRAM_MAX = 900; // keep well under Meta's 1000 char hard limit

function checkApiKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === 'your_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it as an environment variable in your deployment settings.');
  }
}

function getMessageSpec(channel: string, tone: string): string {
  const isInstagram = channel.toLowerCase().includes('instagram');
  if (isInstagram) {
    return `a punchy, conversational Instagram DM in a ${tone} tone — MAXIMUM 300 characters, no hashtags, no formal sign-offs, feels like a real human reaching out, not a sales pitch`;
  }
  return `a highly personalised ${tone} outreach message for ${channel}, 150-250 words, referencing their industry and likely challenges, written as if from Lifts Media`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company, industry, website, notes, channel, tone } = body;

    if (!company || !industry || !channel || !tone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isInstagram = channel.toLowerCase().includes('instagram');
    const messageSpec = getMessageSpec(channel, tone);

    const prompt = `You are an expert B2B sales strategist and lead qualification specialist working for Lifts Media, a brand growth agency.

Analyse the following prospect and provide a structured response:

Company: ${company}
Industry: ${industry}
Website: ${website || 'Not provided'}
Additional Notes: ${notes || 'None'}
Preferred Outreach Channel: ${channel}
Desired Tone: ${tone}

Provide your analysis as a JSON object with EXACTLY this structure:
{
  "lead_score": <integer 1-100, based on fit with a brand growth agency>,
  "pain_points": [<3-5 specific, realistic pain points this company likely faces>],
  "outreach_message": "<${messageSpec}>"
}
${isInstagram ? '\nCRITICAL: The outreach_message MUST be under 300 characters. Count carefully.' : ''}

Return ONLY the JSON object, no other text.`;

    checkApiKey();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response from AI' }, { status: 500 });
    }

    let parsed: { lead_score: number; pain_points: string[]; outreach_message: string };
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content.text);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Hard cap for Instagram — truncate at last complete sentence under the limit
    if (isInstagram && parsed.outreach_message.length > INSTAGRAM_MAX) {
      const truncated = parsed.outreach_message.slice(0, INSTAGRAM_MAX);
      const lastSentence = truncated.lastIndexOf('.');
      parsed.outreach_message = lastSentence > 200
        ? truncated.slice(0, lastSentence + 1)
        : truncated.trimEnd() + '…';
    }

    const prospect = createProspect({
      company,
      industry,
      website,
      notes,
      channel,
      tone,
      lead_score: Math.min(100, Math.max(1, parsed.lead_score)),
      pain_points: parsed.pain_points,
      outreach_message: parsed.outreach_message,
    });

    return NextResponse.json({ prospect, analysis: parsed });
  } catch (error) {
    console.error('Research error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
