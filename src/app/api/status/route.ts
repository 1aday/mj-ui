import { NextResponse } from 'next/server';

async function checkStatus(hash: string) {
    try {
        console.log('Checking status for hash:', hash);
        const response = await fetch(`${process.env.MIDJOURNEY_API_BASE_URL}/midjourney/v2/status?hash=${hash}`, {
            method: 'GET',
            headers: {
                'api-key': process.env.MIDJOURNEY_API_KEY || ''
            }
        });

        const rawResponse = await response.text();
        console.log('Raw API Response:', rawResponse);

        if (!response.ok) {
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                response: rawResponse
            });
            throw new Error(`API request failed: ${response.statusText}`);
        }

        let data;
        try {
            data = JSON.parse(rawResponse);
            console.log('Parsed API Response:', {
                status: data.status,
                progress: data.progress,
                result: data.result
            });
        } catch (e) {
            console.error('Failed to parse API response as JSON:', e);
            throw new Error('Invalid JSON response from API');
        }

        return {
            status: data.status,
            progress: typeof data.progress === 'number' ? data.progress : 0,
            result: data.result,
            status_reason: data.status_reason,
            next_actions: data.next_actions,
            hash: data.hash
        };
    } catch (error) {
        console.error('Error checking status:', error);
        throw error;
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const hash = searchParams.get('hash');

        if (!hash) {
            return NextResponse.json(
                { error: 'Hash parameter is required' },
                { status: 400 }
            );
        }

        const result = await checkStatus(hash);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in status route:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to check status';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
} 