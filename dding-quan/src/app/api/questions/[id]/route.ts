import { NextResponse } from 'next/server';
import { getQuestion } from '@/lib/store';

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const q = getQuestion(context.params.id);
  if (!q) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(q);
}






