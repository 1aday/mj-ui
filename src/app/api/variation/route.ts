import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { hash, choice } = body;

        if (!hash || !choice) {
            return NextResponse.json(
                { error: 'Hash and choice are required' },
                { status: 400 }
            );
        }

        const response = await fetch(`${process.env.MIDJOURNEY_API_BASE_URL}/midjourney/v2/variation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.MIDJOURNEY_API_KEY || ''
            },
            body: JSON.stringify({
                hash,
                choice
            })
        });

        const data = await response.json();
        console.log('Variation API response:', data);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in variation route:', error);
        return NextResponse.json(
            { error: 'Failed to process variation request' },
            { status: 500 }
        );
    }
} 