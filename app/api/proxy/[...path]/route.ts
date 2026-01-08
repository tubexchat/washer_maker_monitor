import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const TARGET_BASE_URL = 'https://api.renance.xyz/api/v1';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return handleProxy(request, await params);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return handleProxy(request, await params);
}

async function handleProxy(request: NextRequest, params: { path: string[] }) {
    const pathJoined = params.path.join('/');
    const queryString = request.nextUrl.search;
    const targetUrl = `${TARGET_BASE_URL}/${pathJoined}${queryString}`;

    // Filter headers
    const headers = new Headers();
    const allowedHeaders = ['content-type', 'authorization', 'x-api-key'];
    request.headers.forEach((value, key) => {
        if (allowedHeaders.includes(key.toLowerCase())) {
            headers.set(key, value);
        }
    });

    const body = request.method === 'POST' ? await request.text() : undefined;

    try {
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: headers,
            body: body,
            cache: 'no-store'
        });

        const responseBody = await response.text();

        return new NextResponse(responseBody, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json'
            }
        });
    } catch (error) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Proxy request failed' }, { status: 500 });
    }
}
