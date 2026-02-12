import React, { useEffect, useState } from "react"
import { TrendingUp, Users, Activity, DollarSign } from "lucide-react"
import { Link } from "react-router-dom"
import ChatInterface from "../components/ChatInterface"

const StatCard = ({
  icon: Icon,
  title,
  value,
  change,
  positive,
}: {
  icon: React.ElementType
  title: string
  value: string | number
  change: string
  positive: boolean
}) => (
  <Link
    to={
      title === "Nifty 50"
        ? "/stock/^NSEI"
        : title === "Sensex"
          ? "/stock/^BSESN"
          : "#"
    }
  >
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-alpha-border hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex justify-between items-start mb-4">
        <div
          className={`p-3 rounded-xl ${positive ? "bg-alpha-success/10 text-alpha-success" : "bg-alpha-danger/10 text-alpha-danger"}`}
        >
          <Icon size={24} />
        </div>
        <span
          className={`text-sm font-medium px-2 py-1 rounded-lg ${positive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
        >
          {change}
        </span>
      </div>
      <h3 className="text-alpha-muted text-sm font-medium uppercase tracking-wide">
        {title}
      </h3>
      <p className="text-2xl font-bold text-alpha-deep mt-1">{value}</p>
    </div>
  </Link>
)

import { api } from "../services/api"
import CandlestickChart from "../components/CandlestickChart"

interface MarketSentimentData {
  ticker: string
  signal: "BUY" | "SELL" | "HOLD"
  rsi: number
  sma_50: number
  current_price: number
}

const MarketChart = () => {
  const [data, setData] = useState<
    {
      date: Date
      open: number
      high: number
      low: number
      close: number
      volume: number
    }[]
  >([])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const historyData = await api.get<
          {
            date: string
            open: number
            high: number
            low: number
            close: number
            volume: number
          }[]
        >("/stock/^NSEI/history?period=1mo")
        // Map data to match CandlestickChart requirements
        const mappedData = (historyData || []).map((d) => ({
          ...d,
          date: new Date(d.date), // Convert string date to Date object
        }))
        setData(mappedData)
      } catch (e) {
        console.error("Failed to fetch market chart", e)
      }
    }
    fetchHistory()
  }, [])

  return (
    <div className="bg-white p-6 rounded-2xl border border-alpha-border shadow-sm h-96 flex flex-col">
      <h3 className="text-lg font-semibold text-alpha-deep mb-4">
        Nifty 50 Trend
      </h3>
      <div className="flex-1 min-h-0 w-full">
        {data.length > 0 ? (
          <div style={{ width: "100%", height: "100%" }}>
            <CandlestickChart data={data} width={800} height={300} ratio={1} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-alpha-muted">
            Loading Market Data...
          </div>
        )}
      </div>
    </div>
  )
}

const MarketSentiment = () => {
  const [sentiment, setSentiment] = useState<MarketSentimentData | null>(null)

  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        // Using Nifty 50 Analysis as proxy for market sentiment
        const sentimentData = await api.get<MarketSentimentData>(
          "/stock/^NSEI/analysis",
        )
        setSentiment(sentimentData)
      } catch (e) {
        console.error("Failed to fetch sentiment", e)
      }
    }
    fetchSentiment()
  }, [])

  // ... render remains the same
  return (
    <div className="bg-white p-6 rounded-2xl border border-alpha-border shadow-sm h-96 flex flex-col">
      <h3 className="text-lg font-semibold text-alpha-deep mb-4">
        Market Sentiment Radar
      </h3>
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        {sentiment ? (
          <>
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* Simple Guage Visual */}
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full transform -rotate-90"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#E2E8F0"
                  strokeWidth="10"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke={
                    sentiment.rsi > 70
                      ? "#EF4444"
                      : sentiment.rsi < 30
                        ? "#10B981"
                        : "#3B82F6"
                  }
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray={`${(sentiment.rsi / 100) * 283} 283`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-alpha-deep">
                <span className="text-3xl font-bold">
                  {Math.round(sentiment.rsi)}
                </span>
                <span className="text-xs text-alpha-muted">RSI</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-alpha-deep">
                Market is{" "}
                <span
                  className={
                    sentiment.signal === "BUY"
                      ? "text-green-600"
                      : sentiment.signal === "SELL"
                        ? "text-red-600"
                        : "text-blue-600"
                  }
                >
                  {sentiment.signal === "HOLD" ? "NEUTRAL" : sentiment.signal}
                </span>
              </p>
              <p className="text-xs text-alpha-muted max-w-[200px] mt-2 mx-auto">
                Based on Nifty 50 technical analysis (RSI & SMA).
              </p>
            </div>
          </>
        ) : (
          <div className="text-alpha-muted">Analyzing sentiment...</div>
        )}
      </div>
    </div>
  )
}

interface MarketAnalysis {
  sectors: { name: string; change: number; performance: string }[]
  movers: {
    gainers: { symbol: string; price: number; change: number }[]
    losers: { symbol: string; price: number; change: number }[]
  }
}

const MarketMovers = () => {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null)

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const data = await api.get<MarketAnalysis>("/stock/market/analysis")
        setAnalysis(data)
      } catch (e) {
        console.error("Failed to fetch market analysis", e)
      }
    }
    fetchAnalysis()
  }, [])

  if (!analysis) return null

  return (
    <div className="bg-white p-6 rounded-2xl border border-alpha-border shadow-sm h-96 flex flex-col">
      <h3 className="text-lg font-semibold text-alpha-deep mb-4">Top Movers</h3>
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        <div>
          <h4 className="text-sm font-medium text-green-600 mb-3 uppercase tracking-wider">
            Top Gainers
          </h4>
          <div className="space-y-3">
            {analysis.movers.gainers.map((stock, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="font-medium text-gray-700">
                  {stock.symbol.replace(".NS", "")}
                </span>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">
                    ₹{stock.price}
                  </div>
                  <div className="text-xs text-green-600">+{stock.change}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-red-600 mb-3 uppercase tracking-wider">
            Top Losers
          </h4>
          <div className="space-y-3">
            {analysis.movers.losers.map((stock, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="font-medium text-gray-700">
                  {stock.symbol.replace(".NS", "")}
                </span>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">
                    ₹{stock.price}
                  </div>
                  <div className="text-xs text-red-600">{stock.change}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface MarketData {
  title: string
  value: number
  change: string
  positive: boolean
}

const Dashboard = () => {
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const data = await api.get<MarketData[]>("/stock/market/summary")
        setMarketData(data || [])
      } catch (error) {
        console.error("Failed to fetch market data", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMarketData()
  }, [])

  return (
    <div className="space-y-8 relative">
      <div>
        <h2 className="text-2xl font-bold text-alpha-deep">Market Overview</h2>
        <p className="text-alpha-muted">
          Real-time artificial intelligence analysis of global markets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-4 text-center py-10 text-alpha-muted">
            Initializing Matrix Intelligence...
          </div>
        ) : (
          <>
            <StatCard
              icon={TrendingUp}
              title="Nifty 50"
              value={
                marketData.find((d) => d.title === "Nifty 50")?.value || "---"
              }
              change={
                marketData.find((d) => d.title === "Nifty 50")?.change || "---"
              }
              positive={
                marketData.find((d) => d.title === "Nifty 50")?.positive ??
                false
              }
            />
            <StatCard
              icon={Activity}
              title="Sensex"
              value={
                marketData.find((d) => d.title === "Sensex")?.value || "---"
              }
              change={
                marketData.find((d) => d.title === "Sensex")?.change || "---"
              }
              positive={
                marketData.find((d) => d.title === "Sensex")?.positive ?? false
              }
            />
            <StatCard
              icon={DollarSign}
              title="Nifty Bank"
              value={
                marketData.find((d) => d.title === "Nifty Bank")?.value || "---"
              }
              change={
                marketData.find((d) => d.title === "Nifty Bank")?.change ||
                "---"
              }
              positive={
                marketData.find((d) => d.title === "Nifty Bank")?.positive ??
                false
              }
            />
            <StatCard
              icon={Users}
              title="India VIX"
              value={
                marketData.find((d) => d.title === "India VIX")?.value || "---"
              }
              change={
                marketData.find((d) => d.title === "India VIX")?.change || "---"
              }
              positive={
                marketData.find((d) => d.title === "India VIX")?.positive ??
                false
              }
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <MarketChart />
        </div>
        <div>
          <MarketSentiment />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <MarketMovers />
        </div>
        {/* Placeholder for future widgets */}
      </div>

      <ChatInterface />
    </div>
  )
}

export default Dashboard
