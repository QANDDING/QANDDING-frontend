import { NextResponse } from 'next/server';
import { listQuestions } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const pageSize = Math.max(1, Math.min(50, Number(searchParams.get('pageSize') || 10)));
  const data = listQuestions(page, pageSize);
  return NextResponse.json(data);
}






