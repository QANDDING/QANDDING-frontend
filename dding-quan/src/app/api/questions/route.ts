import { NextResponse } from 'next/server';
import { addQuestion } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body?.title || '').trim();
    const subject = String(body?.subject || '').trim();
    const content = String(body?.content || '').trim();

    if (!title || !subject || !content) {
      return NextResponse.json({ message: '모든 필드를 입력하세요.' }, { status: 400 });
    }

    const created = addQuestion({ title, subject, content });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: '서버 오류' }, { status: 500 });
  }
}


