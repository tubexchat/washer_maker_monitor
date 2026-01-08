'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Activity,
    Layers,
    Calendar,
    BarChart2,
    Zap,
    LayoutDashboard,
    Clock,
    TrendingUp,
    DollarSign,
    ArrowUpRight,
    MonitorPlay
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import MarketData from '@/components/MarketData';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---

interface Summary {
    total_volume_usd: number;
    trade_count: number;
    total_fees: number;
}

interface SymbolData {
    symbol: string;
    volume_usd: number;
    trade_count: number;
    fees: number;
}

interface VolumeData {
    summary?: Summary;
    by_symbol?: SymbolData[];
    by_time?: any[];
}

// --- Main Component ---

export default function Dashboard() {
    // Volume Stats State
    const [statsLoading, setStatsLoading] = useState(false);
    const [volumeData, setVolumeData] = useState<VolumeData | null>(null);

    // Market Data State
    const [activeSymbol, setActiveSymbol] = useState('BTCUSDT');

    // Time State for Hydration Fix
    const [currentTime, setCurrentTime] = useState<string>('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setCurrentTime(new Date().toUTCString());
        const timer = setInterval(() => {
            setCurrentTime(new Date().toUTCString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // --- Volume Stats Logic ---

    const fetchDailyStats = useCallback(async () => {
        setStatsLoading(true);

        const fetchWithRetry = async (retries = 3, delay = 500): Promise<any> => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            try {
                const today = new Date().toISOString().split('T')[0];
                const url = `/api/volume?start_date=${today}&end_date=${today}`;

                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.json();
            } catch (err: any) {
                clearTimeout(timeoutId);
                if (retries > 0 && err.name !== 'AbortError') {
                    await new Promise(r => setTimeout(r, delay));
                    return fetchWithRetry(retries - 1, delay * 2);
                }
                throw err;
            }
        };

        try {
            const data = await fetchWithRetry();
            if (data) setVolumeData(data);
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                console.warn("Usage stats unavailable:", e.message);
            }
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // Initial Fetch
    useEffect(() => {
        fetchDailyStats();
    }, [fetchDailyStats]);


    // --- Helper Formatters ---

    const formatMoney = (val: number | string | undefined) => {
        const num = typeof val === 'string' ? parseFloat(val) : (val || 0);
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(num);
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#030406] text-sm selection:bg-blue-500/30 font-sans pb-20 relative overflow-hidden">

            {/* Background Ambient Glow */}
            <div className="fixed top-0 left-0 w-full h-[500px] bg-blue-900/10 blur-[120px] pointer-events-none rounded-full transform -translate-y-1/2"></div>

            {/* Top Header */}
            <header className="sticky top-0 z-50 glass-panel border-b border-white/5 h-16 flex items-center px-6 justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30">
                        R
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white leading-none tracking-tight">WASHER <span className="text-blue-400">MONITOR</span></h1>
                        <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Institutional Grade</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-bold tracking-wide uppercase">System Operational</span>
                    </div>

                    <div className="h-6 w-px bg-white/10 hidden md:block"></div>

                    <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {currentTime}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-6 lg:p-8 max-w-[1800px] mx-auto space-y-8 relative z-10">

                {/* Stats Grid */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Today's Volume Hero Card */}
                    <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
                        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group border border-blue-500/20 shadow-[0_0_40px_-10px_rgba(59,130,246,0.15)]">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all duration-500 transform group-hover:scale-110">
                                <Activity className="w-32 h-32 text-blue-500" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
                                        <BarChart2 className="w-4 h-4" />
                                    </span>
                                    <h2 className="text-xs font-bold text-blue-200 uppercase tracking-widest">Today's Volume</h2>
                                </div>

                                <div className="mb-8">
                                    <div className="text-5xl font-mono font-bold text-white tracking-tighter text-glow">
                                        {statsLoading && !volumeData ? (
                                            <span className="animate-pulse text-gray-700">---</span>
                                        ) : (
                                            formatMoney(volumeData?.summary?.total_volume_usd)
                                        )}
                                    </div>
                                    <div className="text-xs text-blue-300/60 mt-2 font-medium">Aggregated 24h Volume USD</div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5 hover:bg-white/[0.05] transition-colors">
                                        <div className="text-[10px] uppercase text-gray-500 mb-1.5 font-bold tracking-wider">Trades</div>
                                        <div className="text-xl font-mono text-white font-semibold">
                                            {volumeData?.summary?.trade_count?.toLocaleString() || 0}
                                        </div>
                                    </div>
                                    <div className="bg-emerald-500/[0.03] p-4 rounded-xl border border-emerald-500/10 hover:bg-emerald-500/[0.06] transition-colors">
                                        <div className="text-[10px] uppercase text-emerald-500/60 mb-1.5 font-bold tracking-wider">Fees Gen</div>
                                        <div className="text-xl font-mono text-emerald-400 font-semibold">
                                            {formatMoney(volumeData?.summary?.total_fees)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Market Breakdown Table */}
                        <div className="glass-panel flex-1 rounded-2xl overflow-hidden flex flex-col min-h-[300px]">
                            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                                <h3 className="font-bold text-gray-200 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-gray-500" />
                                    Market Breakdown
                                </h3>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white/[0.02] text-gray-500 font-medium border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Pair</th>
                                            <th className="px-6 py-3 text-right font-medium">Vol</th>
                                            <th className="px-6 py-3 text-right font-medium">Txs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {volumeData?.by_symbol?.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors cursor-default">
                                                <td className="px-6 py-3.5 font-semibold text-white">
                                                    {item.symbol}
                                                </td>
                                                <td className="px-6 py-3.5 text-right font-mono text-gray-300">
                                                    {formatMoney(item.volume_usd)}
                                                </td>
                                                <td className="px-6 py-3.5 text-right font-mono text-gray-400">
                                                    {item.trade_count}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!volumeData?.by_symbol || volumeData.by_symbol.length === 0) && (
                                            <tr>
                                                <td colSpan={3} className="text-center text-gray-600 py-12 italic">No market data available</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Live Monitor Column */}
                    <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col gap-6">

                        {/* Control Bar */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20 text-white">
                                    <MonitorPlay className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight">Live Market Monitor</h2>
                                    <p className="text-xs text-gray-500 font-medium">Real-time orderbook and trade feed execution.</p>
                                </div>
                            </div>

                            <div className="glass-panel p-1 rounded-lg flex gap-1">
                                {['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].map(sym => (
                                    <button
                                        key={sym}
                                        onClick={() => setActiveSymbol(sym)}
                                        className={cn(
                                            "px-4 py-2 rounded-md text-xs font-bold transition-all border border-transparent",
                                            activeSymbol === sym
                                                ? "bg-blue-600 text-white shadow-md border-blue-500/50"
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {sym}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Visualizer */}
                        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl h-[700px] relative bg-[#050608]">
                            <MarketData symbol={activeSymbol} />
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
