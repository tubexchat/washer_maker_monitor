import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const API_KEY = 'jLaOQFpw7GfWSUjccDdeprgPuVz6Cev8SmJu1IDLaek=';
const API_BASE_URL = 'https://api.renance.xyz/api/v1/admin/stats/trade-volume';

export async function GET(request: NextRequest) {
    try {
        // Get query parameters from the request
        const searchParams = request.nextUrl.searchParams;

        // Build query string for the external API
        const queryParams = new URLSearchParams();
        searchParams.forEach((value, key) => {
            queryParams.append(key, value);
        });

        // Make request to the Renance API
        const url = `${API_BASE_URL}?${queryParams.toString()}`;

        const response = await fetch(url, {
            headers: {
                'X-API-Key': API_KEY
            },
            // Add cache control
            next: { revalidate: 0 } // Don't cache, always fetch fresh data
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `API请求失败: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('API proxy error:', error);
        return NextResponse.json(
            { error: '服务器内部错误' },
            { status: 500 }
        );
    }
}
