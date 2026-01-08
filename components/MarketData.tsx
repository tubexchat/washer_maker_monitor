'use client';

import { useState, useEffect, useRef } from 'react';
import { Activity, ArrowDown, ArrowUp, Zap, BarChart3, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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

    // Initial Snapshot Fetch via Proxy
    const fetchSnapshots = async () => {
        try {
            const obRes = await fetch(`/api/proxy/markets/${symbol}/orderbook`);
            if (obRes.ok) {
                setOrderbook(await obRes.json());
            }

            const trRes = await fetch(`/api/proxy/markets/${symbol}/trades`);
            if (trRes.ok) {
                setTrades(await trRes.json());
            }

            const tickerRes = await fetch(`/api/proxy/markets/${symbol}/ticker`);
            if (tickerRes.ok) {
                setTicker(await tickerRes.json());
            }
        } catch (err) {
            console.error("Failed to fetch market snapshots", err);
        }
    };

    useEffect(() => {
        fetchSnapshots();

        // Setup WebSocket
        const connectWs = () => {
            const socket = new WebSocket('ws://api.renance.xyz/ws/');
            ws.current = socket;

            socket.onopen = () => {
                setWsStatus('open');
                // Subscribe to Orderbook
                socket.send(JSON.stringify({
                    type: "subscribe",
                    channel: `orderbook:${symbol}`
                }));
                // Subscribe to Trades
                socket.send(JSON.stringify({
                    type: "subscribe",
                    channel: `trades:${symbol}`
                }));
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.channel === `orderbook:${symbol}`) {
                        setOrderbook(data.data);
                    } else if (data.channel === `trades:${symbol}`) {
                        // Data might be a single trade or array
                        const newTrade = data.data;
                        setTrades(prev => [newTrade, ...prev].slice(0, 50));
                        // Also update ticker price
                        setTicker(prev => ({
                            ...prev!,
                            price: newTrade.price
                        }));
                    }
                } catch (e) {
                    console.error("WS Message Error", e);
                }
            };

            socket.onerror = () => setWsStatus('error');
            socket.onclose = () => {
                setWsStatus('closed');
                // Reconnect after 3s
                setTimeout(connectWs, 3000);
            };
        };

        connectWs();

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [symbol]);

    const formatPrice = (p: string) => parseFloat(p).toFixed(2);
    const formatAmount = (a: string) => parseFloat(a).toFixed(4);

    const bestBid = orderbook.bids[0]?.price;
    const bestAsk = orderbook.asks[0]?.price;
    const spread = bestBid && bestAsk ? parseFloat(bestAsk) - parseFloat(bestBid) : 0;
    const spreadPercent = bestAsk ? (spread / parseFloat(bestAsk)) * 100 : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {/* Orderbook Section */}
            <div className="data-card flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-zinc-900/30">
                    <div className="flex items-center gap-2">
                        <Zap className={cn("w-3 h-3", wsStatus === 'open' ? "text-yellow-400" : "text-gray-500")} />
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">Orderbook</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                        <span>Spread: {spread.toFixed(2)} ({spreadPercent.toFixed(3)}%)</span>
                        <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                        <span>{symbol}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-[#0b0e11] text-[11px] scrollbar-thin">
                    <table className="w-full font-mono">
                        <thead>
                            <tr className="text-gray-500 text-left border-b border-white/5 sticky top-0 bg-[#0b0e11] z-10">
                                <th className="px-4 py-2 font-normal">Price (USD)</th>
                                <th className="px-4 py-2 font-normal text-right">Size ({symbol.replace('USDT', '')})</th>
                                <th className="px-4 py-2 font-normal text-right">Sum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Asks (Sell) */}
                            {[...orderbook.asks].reverse().slice(-12).map((ask, i) => (
                                <tr key={`ask-${i}`} className="hover:bg-rose-500/10 group text-rose-400 transition-colors">
                                    <td className="px-4 py-0.5 font-medium">{formatPrice(ask.price)}</td>
                                    <td className="px-4 py-0.5 text-right">{formatAmount(ask.amount)}</td>
                                    <td className="px-4 py-0.5 text-right text-gray-500 italic">
                                        {(parseFloat(ask.price) * parseFloat(ask.amount)).toFixed(2)}
                                    </td>
                                </tr>
                            ))}

                            {/* Current Price Marker */}
                            <tr className="bg-zinc-900/80 border-y border-white/10">
                                <td colSpan={3} className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-xl font-bold text-white tracking-widest">
                                            {ticker?.price ? formatPrice(ticker.price) : '---'}
                                        </span>
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Last Price</span>
                                            <span className="text-[10px] text-emerald-400 font-bold">↑ 0.12%</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>

                            {/* Bids (Buy) */}
                            {orderbook.bids.slice(0, 12).map((bid, i) => (
                                <tr key={`bid-${i}`} className="hover:bg-emerald-500/10 group text-emerald-400 transition-colors">
                                    <td className="px-4 py-0.5 font-medium">{formatPrice(bid.price)}</td>
                                    <td className="px-4 py-0.5 text-right">{formatAmount(bid.amount)}</td>
                                    <td className="px-4 py-0.5 text-right text-gray-500 italic">
                                        {(parseFloat(bid.price) * parseFloat(bid.amount)).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Trades Section */}
            <div className="data-card flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-zinc-900/30">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-3 h-3 text-blue-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">Recent Trades</span>
                    </div>
                    <Clock className="w-3 h-3 text-gray-500" />
                </div>

                <div className="flex-1 overflow-auto bg-[#0b0e11] text-[11px]">
                    <table className="w-full font-mono">
                        <thead>
                            <tr className="text-gray-500 text-left border-b border-white/5">
                                <th className="px-4 py-2 font-normal">Price</th>
                                <th className="px-4 py-2 font-normal text-right">Amount</th>
                                <th className="px-4 py-2 font-normal text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.slice(0, 20).map((trade, i) => (
                                <tr key={i} className="hover:bg-white/[0.02]">
                                    <td className={cn(
                                        "px-4 py-1",
                                        trade.side === 'buy' ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        {formatPrice(trade.price)}
                                    </td>
                                    <td className="px-4 py-1 text-right text-gray-300">{formatAmount(trade.amount)}</td>
                                    <td className="px-4 py-1 text-right text-gray-500">
                                        {new Date(trade.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </td>
                                </tr>
                            ))}
                            {trades.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-600">Waiting for trades...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
