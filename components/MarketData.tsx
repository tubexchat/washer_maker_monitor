'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, ArrowDown, ArrowUp, Zap, BarChart3, Clock, History, Layers } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Utils ---
const formatPrice = (p: string | number) => {
    const val = typeof p === 'string' ? parseFloat(p) : p;
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatAmount = (a: string | number) => {
    const val = typeof a === 'string' ? parseFloat(a) : a;
    return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
};

const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// --- Interfaces ---
interface OrderbookEntry {
    price: string;
    amount: string;
}

interface OrderbookData {
    bids: OrderbookEntry[];
    asks: OrderbookEntry[];
    timestamp?: number;
}

interface Trade {
    id: string;
    price: string;
    amount: string;
    side: 'buy' | 'sell';
    timestamp: number;
}

interface Ticker {
    price: string;
    change24h?: string;
    high24h?: string;
    low24h?: string;
    volume24h?: string;
}

interface MarketDataProps {
    symbol: string;
}

export default function MarketData({ symbol }: MarketDataProps) {
    const [orderbook, setOrderbook] = useState<OrderbookData>({ bids: [], asks: [] });
    const [trades, setTrades] = useState<Trade[]>([]);
    const [ticker, setTicker] = useState<Ticker | null>(null);
    const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');

    const ws = useRef<WebSocket | null>(null);

    // Initial Fetch
    const fetchSnapshots = async () => {
        try {
            // Parallel fetch for speed
            const [obRes, trRes, tickRes] = await Promise.all([
                fetch(`/api/proxy/markets/${symbol}/orderbook`),
                fetch(`/api/proxy/markets/${symbol}/trades`),
                fetch(`/api/proxy/markets/${symbol}/ticker`)
            ]);

            if (obRes.ok) {
                const data = await obRes.json();
                if (data && data.bids && data.asks) {
                    const bids = (data.bids || []).map((b: any) => ({ price: b[0], amount: b[1] }));
                    const asks = (data.asks || []).map((a: any) => ({ price: a[0], amount: a[1] }));
                    setOrderbook({ bids, asks, timestamp: data.timestamp });
                }
            }

            if (trRes.ok) {
                const data = await trRes.json();
                const tradeList = Array.isArray(data.trades) ? data.trades : [];
                setTrades(tradeList);
            }

            if (tickRes.ok) {
                const data = await tickRes.json();
                setTicker({
                    price: data.last_price || data.price,
                    change24h: data.price_change_percent_24h,
                    high24h: data.high_24h,
                    low24h: data.low_24h,
                    volume24h: data.volume_24h
                });
            }
        } catch (err) {
            console.error("[MarketData] Snapshot fetch error", err);
        }
    };

    useEffect(() => {
        setOrderbook({ bids: [], asks: [] });
        setTrades([]);
        setTicker(null);
        fetchSnapshots();

        let shouldReconnect = true;

        const connectWs = () => {
            const socket = new WebSocket('wss://api.renance.xyz/ws');
            ws.current = socket;

            socket.onopen = () => {
                setWsStatus('open');
                socket.send(JSON.stringify({ type: "subscribe", channel: `orderbook:${symbol}` }));
                socket.send(JSON.stringify({ type: "subscribe", channel: `trades:${symbol}` }));
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'orderbook' && data.symbol === symbol) {
                        const bids = (data.bids || []).map((b: any) => ({ price: b.price, amount: b.size }));
                        const asks = (data.asks || []).map((a: any) => ({ price: a.price, amount: a.size }));
                        if (bids.length > 0 || asks.length > 0) {
                            setOrderbook({ bids, asks, timestamp: data.timestamp });
                        }
                    } else if (data.type === 'trade' && data.symbol === symbol) {
                        const newTrade: Trade = {
                            id: data.id,
                            price: data.price,
                            amount: data.amount,
                            side: data.side as 'buy' | 'sell',
                            timestamp: data.timestamp
                        };
                        setTrades(prev => [newTrade, ...prev].slice(0, 50));
                        if (newTrade.price) {
                            setTicker(prev => prev ? { ...prev, price: newTrade.price } : null);
                        }
                    }
                } catch (e) {
                    // silent fail
                }
            };

            socket.onerror = () => setWsStatus('error');
            socket.onclose = () => {
                setWsStatus('closed');
                if (shouldReconnect) setTimeout(connectWs, 3000);
            };
        };

        connectWs();

        return () => {
            shouldReconnect = false;
            if (ws.current) ws.current.close();
        };
    }, [symbol]);

    // Data Processing for Visualization
    const { maxAskSize, maxBidSize } = useMemo(() => {
        const askSizes = orderbook.asks.slice(-15).map(a => parseFloat(a.amount));
        const bidSizes = orderbook.bids.slice(0, 15).map(b => parseFloat(b.amount));
        return {
            maxAskSize: Math.max(...askSizes, 0.0001),
            maxBidSize: Math.max(...bidSizes, 0.0001)
        };
    }, [orderbook]);

    const bestBid = orderbook.bids[0]?.price ? parseFloat(orderbook.bids[0].price) : 0;
    const bestAsk = orderbook.asks[0]?.price ? parseFloat(orderbook.asks[0].price) : 0;
    const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;
    const spreadPercent = bestAsk ? (spread / bestAsk) * 100 : 0;

    return (
        <div className="flex flex-col h-full bg-[#050608] text-white">

            {/* Header: Ticker Info */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#080a0f]">
                <div className="flex items-center gap-6">
                    <div>
                        <div className="text-2xl font-mono font-bold text-white tracking-tight">
                            {ticker?.price ? formatPrice(ticker.price) : <span className="text-gray-600 animate-pulse">---.--</span>}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium mt-1 flex items-center gap-2">
                            <span>Index Price</span>
                            {ticker?.change24h && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                    parseFloat(ticker.change24h) >= 0
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "bg-rose-500/10 text-rose-400"
                                )}>
                                    {parseFloat(ticker.change24h) >= 0 ? '+' : ''}{parseFloat(ticker.change24h).toFixed(2)}%
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="hidden md:flex gap-8 px-6 border-l border-white/5">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-semibold">24h High</span>
                            <span className="text-sm font-mono text-gray-300">{ticker?.high24h ? formatPrice(ticker.high24h) : '--'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-semibold">24h Low</span>
                            <span className="text-sm font-mono text-gray-300">{ticker?.low24h ? formatPrice(ticker.low24h) : '--'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-semibold">24h Vol</span>
                            <span className="text-sm font-mono text-gray-300">{ticker?.volume24h ? formatPrice(ticker.volume24h) : '--'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-colors",
                        wsStatus === 'open'
                            ? "bg-emerald-900/20 text-emerald-400 border-emerald-500/20"
                            : "bg-red-900/20 text-red-400 border-red-500/20"
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", wsStatus === 'open' ? "bg-emerald-400 animate-pulse" : "bg-red-400")}></div>
                        {wsStatus === 'open' ? 'Live Feed' : 'Connecting'}
                    </div>
                </div>
            </div>

            {/* Content: Orderbook + Trades */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/5">

                {/* ORDERBOOK (Left Side) */}
                <div className="lg:col-span-7 flex flex-col h-full bg-[#050608]">
                    <div className="px-4 py-2 border-b border-white/5 flex justify-between items-center bg-[#080a0f]">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Layers className="w-3 h-3" /> Order Book
                        </span>
                        <span className="text-[10px] text-gray-600 font-mono">Size shown relative to local max</span>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        {/* Header */}
                        <div className="grid grid-cols-3 px-4 py-2 text-[10px] text-gray-500 font-semibold border-b border-white/5 uppercase tracking-wide">
                            <div>Price (USD)</div>
                            <div className="text-right">Size</div>
                            <div className="text-right">Total</div>
                        </div>

                        {/* Asks (Sells) */}
                        <div className="flex-1 overflow-hidden flex flex-col justify-end pb-1">
                            {orderbook.asks.slice(-16).reverse().map((ask, i) => {
                                const sizePct = (parseFloat(ask.amount) / maxAskSize) * 100;
                                return (
                                    <div key={`ask-${i}`} className="grid grid-cols-3 px-4 py-[3px] text-xs font-mono relative hover:bg-white/[0.03] transition-colors cursor-pointer group">
                                        {/* Depth Bar */}
                                        <div
                                            className="absolute top-0 bottom-0 right-0 bg-rose-500/[0.15] z-0 transition-all duration-300"
                                            style={{ width: `${Math.min(sizePct, 100)}%` }}
                                        ></div>

                                        <span className="text-rose-400 relative z-10 font-medium group-hover:text-rose-300">{formatPrice(ask.price)}</span>
                                        <span className="text-right text-gray-300 relative z-10">{formatAmount(ask.amount)}</span>
                                        <span className="text-right text-gray-500 relative z-10">
                                            {(parseFloat(ask.price) * parseFloat(ask.amount)).toFixed(0)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Spread Indicator */}
                        <div className="border-y border-white/5 bg-[#0b0e12] py-2 flex items-center justify-center gap-4 my-1">
                            <div className="text-sm font-mono font-bold text-white">
                                {ticker?.price ? formatPrice(ticker.price) : '---'}
                            </div>
                            <div className="text-[10px] font-mono text-gray-500">
                                Spread: <span className="text-gray-300">{spread.toFixed(2)}</span> ({spreadPercent.toFixed(3)}%)
                            </div>
                        </div>

                        {/* Bids (Buys) */}
                        <div className="flex-1 overflow-hidden pt-1">
                            {orderbook.bids.slice(0, 16).map((bid, i) => {
                                const sizePct = (parseFloat(bid.amount) / maxBidSize) * 100;
                                return (
                                    <div key={`bid-${i}`} className="grid grid-cols-3 px-4 py-[3px] text-xs font-mono relative hover:bg-white/[0.03] transition-colors cursor-pointer group">
                                        {/* Depth Bar */}
                                        <div
                                            className="absolute top-0 bottom-0 right-0 bg-emerald-500/[0.15] z-0 transition-all duration-300"
                                            style={{ width: `${Math.min(sizePct, 100)}%` }}
                                        ></div>

                                        <span className="text-emerald-400 relative z-10 font-medium group-hover:text-emerald-300">{formatPrice(bid.price)}</span>
                                        <span className="text-right text-gray-300 relative z-10">{formatAmount(bid.amount)}</span>
                                        <span className="text-right text-gray-500 relative z-10">
                                            {(parseFloat(bid.price) * parseFloat(bid.amount)).toFixed(0)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* TRADES (Right Side) */}
                <div className="lg:col-span-5 flex flex-col h-full bg-[#050608] border-l border-white/5">
                    <div className="px-4 py-2 border-b border-white/5 flex justify-between items-center bg-[#080a0f]">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <History className="w-3 h-3" /> Recent Trades
                        </span>
                    </div>

                    <div className="grid grid-cols-3 px-4 py-2 text-[10px] text-gray-500 font-semibold border-b border-white/5 uppercase tracking-wide">
                        <div>Price</div>
                        <div className="text-right">Amt</div>
                        <div className="text-right">Time</div>
                    </div>

                    <div className="flex-1 overflow-auto scrollbar-thin">
                        {trades.map((trade, i) => (
                            <div key={`${trade.id}-${i}`} className="grid grid-cols-3 px-4 py-[3px] text-xs font-mono hover:bg-white/[0.03] transition-colors border-b border-white/[0.02]">
                                <span className={cn(
                                    "font-medium",
                                    trade.side === 'buy' ? "text-emerald-400" : "text-rose-400"
                                )}>
                                    {formatPrice(trade.price)}
                                </span>
                                <span className="text-right text-gray-300">{formatAmount(trade.amount)}</span>
                                <span className="text-right text-gray-500">{formatTime(trade.timestamp)}</span>
                            </div>
                        ))}
                        {trades.length === 0 && (
                            <div className="p-8 text-center text-gray-600 text-xs italic">
                                Waiting for market activity...
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
