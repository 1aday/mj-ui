import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const history = await prisma.imageGeneration.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
} 