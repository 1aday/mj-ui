import { NextResponse } from 'next/server';

async function generateImage(prompt: string) {
    try {
        console.log('Making request to:', `${process.env.MIDJOURNEY_API_BASE_URL}/midjourney/v2/imagine`);
        console.log('Using API Key:', process.env.MIDJOURNEY_API_KEY ? '***' + process.env.MIDJOURNEY_API_KEY.slice(-4) : 'Not set');

        const requestBody = {
            prompt,
            process_mode: 'relax',
            aspect_ratio: '1:1',
            webhook_endpoint: '',
            webhook_secret: ''
        };

        console.log('Request body:', requestBody);

        const response = await fetch(`${process.env.MIDJOURNEY_API_BASE_URL}/midjourney/v2/imagine`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.MIDJOURNEY_API_KEY || ''
            },
            body: JSON.stringify(requestBody)
        });

        const rawResponse = await response.text();
        console.log('Raw API Response:', rawResponse);
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        let data;
        try {
            data = JSON.parse(rawResponse);
            console.log('Parsed API Response:', data);
            console.log('Available fields in response:', Object.keys(data));
        } catch (e) {
            console.error('Failed to parse API response as JSON:', e);
            throw new Error('Invalid JSON response from API');
        }

        if (!response.ok) {
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                data
            });
            throw new Error(`API request failed: ${data.error || response.statusText}`);
        }

        // The API returns only a hash, which we'll use as both taskId and hash
        const hash = data.hash;
        if (!hash) {
            console.error('Missing hash field in response. Available fields:', Object.keys(data));
            throw new Error('Invalid API response: missing hash');
        }

        const result = {
            taskId: hash,  // Use hash as taskId since that's all we get
            hash
        };

        console.log('Processed result:', result);
        return result;

    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('Received request body:', body);

        const { prompt } = body;
        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        const result = await generateImage(prompt);
        console.log('Returning result:', result);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in generate route:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
        console.error('Returning error:', errorMessage);
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
} 