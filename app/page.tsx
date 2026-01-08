'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Layers,
  Calendar,
  BarChart2,
  Zap,
  LayoutDashboard,
  Clock
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

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-[#050505] text-sm font-sans selection:bg-blue-500/30">

      {/* Optimized Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center px-6 lg:px-8 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
            R
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              WASHER MONITOR
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-gray-400 font-normal border border-white/5">v1.0</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-semibold tracking-wide uppercase">System Online</span>
          </div>

          <div className="hidden md:block h-8 w-px bg-white/10"></div>

          <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {currentTime}
          </div>
        </div>
      </header>

      {/* Main Content (padded for fixed header) */}
      <div className="pt-24 pb-12 px-6 lg:px-8 max-w-[1600px] mx-auto">

        <div className="grid grid-cols-12 gap-6">

          {/* Left Column: Stats */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

            {/* Daily Summary */}
            <div className="data-card p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity className="w-24 h-24 text-blue-500" />
              </div>

              <div className="flex justify-between items-start mb-6 text-gray-400 relative z-10">
                <h2 className="font-semibold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                  Today's Volume
                </h2>
                <Calendar className="w-4 h-4 text-gray-600" />
              </div>

              <div className="space-y-6 relative z-10">
                <div>
                  <div className="text-4xl font-mono font-bold text-white tracking-tight">
                    {statsLoading && !volumeData ? (
                      <span className="animate-pulse text-gray-700">---</span>
                    ) : (
                      formatMoney(volumeData?.summary?.total_volume_usd)
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.03] p-4 rounded-lg border border-white/5">
                    <div className="text-[10px] uppercase text-gray-500 mb-1 font-semibold">Trades</div>
                    <div className="text-lg font-mono text-white">
                      {volumeData?.summary?.trade_count || 0}
                    </div>
                  </div>
                  <div className="bg-white/[0.03] p-4 rounded-lg border border-white/5">
                    <div className="text-[10px] uppercase text-gray-500 mb-1 font-semibold">Fees Generated</div>
                    <div className="text-lg font-mono text-emerald-400">
                      {formatMoney(volumeData?.summary?.total_fees)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Breakdown */}
            <div className="data-card overflow-hidden flex-1 min-h-[300px]">
              <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="font-semibold text-gray-300 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-3 h-3 text-blue-500" />
                  Market Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] text-gray-500 font-normal">
                    <tr>
                      <th className="px-5 py-3 font-medium">Symbol</th>
                      <th className="px-5 py-3 text-right font-medium">Volume</th>
                      <th className="px-5 py-3 text-right font-medium">Trades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {volumeData?.by_symbol?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-5 py-3 font-medium text-white group-hover:text-blue-400 transition-colors">
                          {item.symbol}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-gray-300">
                          {formatMoney(item.volume_usd)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-gray-400">
                          {item.trade_count}
                        </td>
                      </tr>
                    ))}
                    {(!volumeData?.by_symbol || volumeData.by_symbol.length === 0) && (
                      <tr>
                        <td colSpan={3} className="text-center text-gray-600 py-12 italic">
                          No market data available yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Live Monitor */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            {/* Header for Graph/Data */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-blue-500" />
                  LIVE MARKET MONITOR
                </h2>
              </div>

              <div className="flex p-1 bg-white/5 rounded-lg border border-white/5">
                {['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].map(sym => (
                  <button
                    key={sym}
                    onClick={() => setActiveSymbol(sym)}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                      activeSymbol === sym
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                        : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                    )}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Market Data Visualization */}
            <div className="h-[600px] border border-white/5 rounded-xl overflow-hidden bg-[#0a0a0a] shadow-2xl">
              <MarketData symbol={activeSymbol} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
