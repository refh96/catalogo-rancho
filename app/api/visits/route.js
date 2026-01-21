import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ visits: 0 });
}

export async function POST() {
  return NextResponse.json({ visits: 0 });
}
