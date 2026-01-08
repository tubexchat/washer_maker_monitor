'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Wallet,
  RefreshCw,
  Layers,
  Clock,
  Calendar,
  Search,
  AlertCircle,
  Terminal
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    ethereum?: any;
  }
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

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  order_type: string;
  price: string;
  amount: string;
  status: string;
  created_at: number | string;
}

// --- Constants ---

const ENV_CONFIG = {
  chainId: 42161, // Arbitrum One
  chainName: 'Arbitrum One',
  rpcUrl: 'https://arb1.arbitrum.io/rpc',
  apiProxyUrl: '/api/proxy',
  vaultAddress: '0x5d2efcbdC2dD4b9Ff06Ea396F62878Ef982377c2'
};

const EIP712_DOMAIN = {
  name: 'XBlade Vault',
  version: '1',
  chainId: ENV_CONFIG.chainId,
  verifyingContract: ENV_CONFIG.vaultAddress
};

const EIP712_TYPES = {
  Login: [
    { name: 'wallet', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' }
  ]
};

// --- Main Component ---

export default function Dashboard() {
  // Volume Stats State
  const [statsLoading, setStatsLoading] = useState(false);
  const [volumeData, setVolumeData] = useState<VolumeData | null>(null);

  // Wallet & Order State
  const [address, setAddress] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Poll Interval Ref
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

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
    try {
      const today = new Date().toISOString().split('T')[0];
      // Default to "Today"
      const url = `/api/volume?start_date=${today}&end_date=${today}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVolumeData(data);
      }
    } catch (e) {
      console.error("Failed to fetch volume stats", e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Initial Fetch
  useEffect(() => {
    fetchDailyStats();
  }, [fetchDailyStats]);

  // --- Wallet & Auth Logic ---

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask or another Web3 wallet.");
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const userAddress = accounts[0];

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== ENV_CONFIG.chainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xa4b1' }], // 42161 hex
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask.
          if (switchError.code === 4902) {
            alert("Please add Arbitrum One to your wallet.");
          } else {
            alert("Please switch to Arbitrum One network.");
          }
          setIsConnecting(false);
          return;
        }
      }

      setAddress(userAddress);

      // Auto-Login after connect
      await login(provider, userAddress);

    } catch (err) {
      console.error("Connection failed", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const login = async (provider: BrowserProvider, userAddress: string) => {
    try {
      // 1. Get Nonce
      // 1. Get Nonce
      const nonceUrl = `${ENV_CONFIG.apiProxyUrl}/auth/nonce/${userAddress}`;
      const nonceRes = await fetch(nonceUrl);
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { nonce } = await nonceRes.json();

      // 2. Sign Message
      const timestamp = Math.floor(Date.now() / 1000);
      const signer = await provider.getSigner();

      const value = {
        wallet: userAddress,
        nonce: BigInt(nonce), // Ensure BigInt for ethers v6
        timestamp: BigInt(timestamp)
      };

      const signature = await signer.signTypedData(
        EIP712_DOMAIN,
        EIP712_TYPES,
        value
      );

      // 3. Authenticate
      // 3. Authenticate
      const loginUrl = `${ENV_CONFIG.apiProxyUrl}/auth/login`;
      const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          signature,
          timestamp
        })
      });

      if (!loginRes.ok) throw new Error("Login failed");
      const { token } = await loginRes.json();
      setAuthToken(token);

      // Initial order fetch
      fetchOrders(token);

    } catch (err) {
      console.error("Login Error", err);
      alert("Login failed. Check console for details.");
    }
  };

  const fetchOrders = useCallback(async (token: string) => {
    setOrderLoading(true);
    try {
      // Fetch OPEN orders
      const url = `${ENV_CONFIG.apiProxyUrl}/account/orders?status=open&limit=50`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Fetch orders failed", err);
    } finally {
      setOrderLoading(false);
    }
  }, []);

  // Polling Effect
  useEffect(() => {
    if (authToken) {
      // Poll every 3 seconds
      pollInterval.current = setInterval(() => {
        fetchOrders(authToken);
      }, 3000);
    }

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [authToken, fetchOrders]);


  // --- Helper Formatters ---

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (ts: number | string) => {
    if (!ts) return '-';
    // If number, assume ms? Python script says maybe seconds or ms. usually API is ms if recent, or sec.
    // The script used `datetime.fromtimestamp(created_at / 1000)` implying ms.
    const date = new Date(typeof ts === 'number' ? ts : ts);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="min-h-screen p-6 lg:p-8 text-sm">

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl">
            R
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">WASHER MONITOR</h1>
            <div className="flex items-center gap-2 text-gray-500 text-xs mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              SYSTEM ONLINE
              <span className="mx-1">|</span>
              {currentTime}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!address ? (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="btn btn-primary"
            >
              <Wallet className="w-4 h-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 hover:bg-zinc-800 transition-colors">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-mono text-gray-300">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-8 lg:gap-10">

        {/* Left Column: Daily Stats & Aggregate Data */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">

          {/* Daily Summary Card */}
          <div className="data-card p-6">
            <div className="flex justify-between items-start mb-6 text-gray-400">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                TODAY'S VOLUME
              </h2>
              <Calendar className="w-4 h-4" />
            </div>

            {statsLoading && !volumeData ? (
              <div className="h-32 flex items-center justify-center">Loading...</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase text-gray-500 mb-1">Total Volume (USD)</div>
                  <div className="text-3xl font-mono font-bold text-white tracking-tight">
                    {formatMoney(volumeData?.summary?.total_volume_usd || 0)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-zinc-900/50 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                    <div className="text-xs text-gray-500 mb-1">Trades</div>
                    <div className="text-xl font-mono text-white">
                      {volumeData?.summary?.trade_count || 0}
                    </div>
                  </div>
                  <div className="bg-zinc-900/50 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                    <div className="text-xs text-gray-500 mb-1">Fees</div>
                    <div className="text-xl font-mono text-emerald-400">
                      {formatMoney(volumeData?.summary?.total_fees || 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Symbol Breakdown */}
          <div className="data-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/30">
              <h3 className="font-semibold text-gray-300 text-xs uppercase tracking-wider">Market Breakdown</h3>
              <Layers className="w-3 h-3 text-gray-500" />
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th className="text-right">Vol</th>
                    <th className="text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {volumeData?.by_symbol?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-medium text-white">{item.symbol}</td>
                      <td className="text-right font-mono text-gray-300">
                        ${(item.volume_usd / 1000).toFixed(1)}k
                      </td>
                      <td className="text-right font-mono text-gray-300">{item.trade_count}</td>
                    </tr>
                  ))}
                  {(!volumeData?.by_symbol || volumeData.by_symbol.length === 0) && (
                    <tr>
                      <td colSpan={3} className="text-center text-gray-500 py-6">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Monitor */}
        <div className="col-span-12 lg:col-span-8 flex flex-col h-[calc(100vh-160px)]">
          <div className="data-card flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/30">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <h2 className="font-semibold text-white">OPEN ORDERS MONITOR</h2>
                {authToken && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    LIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs">
                {lastUpdated && (
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                <button
                  onClick={authToken ? () => fetchOrders(authToken) : undefined}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={cn("w-4 h-4", orderLoading && "animate-spin")} />
                </button>
              </div>
            </div>

            {!authToken ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
                <AlertCircle className="w-12 h-12 opacity-20" />
                <p>Connect wallet and sign in to view real-time orders.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto bg-[#0b0e11]">
                <table className="data-table w-full relative">
                  <thead className="sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="w-32 pl-6">TIME</th>
                      <th>SYMBOL</th>
                      <th>TYPE</th>
                      <th>SIDE</th>
                      <th className="text-right">PRICE</th>
                      <th className="text-right">AMOUNT</th>
                      <th className="text-right pr-6">VALUE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {orders.map((order) => {
                      const isBuy = order.side.toLowerCase() === 'buy';
                      const value = parseFloat(order.price) * parseFloat(order.amount);

                      return (
                        <tr key={order.id} className="hover:bg-white/[0.02] transition-colors font-mono text-xs">
                          <td className="pl-6 text-gray-500">{formatDate(order.created_at)}</td>
                          <td className="font-semibold text-gray-300">{order.symbol}</td>
                          <td className="text-gray-400">{order.order_type}</td>
                          <td>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                              isBuy ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                            )}>
                              {order.side}
                            </span>
                          </td>
                          <td className={cn("text-right font-medium", isBuy ? "text-emerald-400" : "text-rose-400")}>
                            {order.price}
                          </td>
                          <td className="text-right text-gray-300">
                            {order.amount}
                          </td>
                          <td className="text-right text-gray-500 pr-6">
                            {formatMoney(value)}
                          </td>
                        </tr>
                      );
                    })}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-500">
                          No open orders found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
