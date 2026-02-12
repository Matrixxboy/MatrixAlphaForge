import React, { useState, useEffect } from "react"
import { useParams } from "react-router-dom"

import {
  ArrowUp,
  ArrowDown,
  Activity,
  Brain,
  AlertTriangle,
  ExternalLink,
} from "lucide-react"
import { api } from "../services/api"
import CandlestickChart from "../components/CandlestickChart"

interface StockHistory {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface StockAnalysis {
  ticker: string
  signal: "BUY" | "SELL" | "HOLD"
  rsi: number
  sma_50: number
  current_price: number
  reasoning: string[]
  fundamentals?: {
    market_cap: string
    pe_ratio: string
    fifty_two_week_high: string
    fifty_two_week_low: string
    sector: string
    industry: string
  }
}

interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
  sentiment: "Positive" | "Negative" | "Neutral"
}

const StockDetails = () => {
  const { ticker } = useParams<{ ticker: string }>()
  const [history, setHistory] = useState<StockHistory[]>([])
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!ticker) return
      setLoading(true)
      try {
        // Fetch History
        const histData = await api.get<StockHistory[]>(
          `/stock/${ticker}/history`,
        )
        setHistory(histData || [])

        // Fetch Analysis
        const analysisData = await api.get<StockAnalysis>(
          `/stock/${ticker}/analysis`,
        )
        setAnalysis(analysisData)

        // Fetch News
        const newsData = await api.get<NewsItem[]>(`/news/${ticker}`)
        setNews(newsData || [])
      } catch (error) {
        console.error("Failed to fetch stock details", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [ticker])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-alpha-muted">
        Analyzing Market Data...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-alpha-deep">{ticker}</h1>
          <p className="text-alpha-muted">Real-time AI Assessment</p>
        </div>
        {analysis && (
          <div className="text-right">
            <div className="text-2xl font-bold text-alpha-deep">
              ₹{analysis.current_price}
            </div>
            <div
              className={`flex items-center justify-end ${analysis.signal === "BUY" ? "text-alpha-success" : analysis.signal === "SELL" ? "text-alpha-danger" : "text-yellow-600"}`}
            >
              {analysis.signal === "BUY" && <ArrowUp size={20} />}
              {analysis.signal === "SELL" && <ArrowDown size={20} />}
              <span className="font-bold ml-1">{analysis.signal} SIGNAL</span>
            </div>
          </div>
        )}
      </div>

      {/* Fundamentals Card */}
      {analysis?.fundamentals && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 bg-white p-6 rounded-2xl border border-alpha-border shadow-sm">
          <div className="space-y-1">
            <p className="text-xs text-alpha-muted uppercase font-semibold">
              Market Cap
            </p>
            <p className="font-medium text-alpha-deep">
              {analysis.fundamentals.market_cap}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-alpha-muted uppercase font-semibold">
              P/E Ratio
            </p>
            <p className="font-medium text-alpha-deep">
              {analysis.fundamentals.pe_ratio}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-alpha-muted uppercase font-semibold">
              52W High
            </p>
            <p className="font-medium text-alpha-success">
              ₹{analysis.fundamentals.fifty_two_week_high}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-alpha-muted uppercase font-semibold">
              52W Low
            </p>
            <p className="font-medium text-alpha-danger">
              ₹{analysis.fundamentals.fifty_two_week_low}
            </p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="text-xs text-alpha-muted uppercase font-semibold">
              Sector / Industry
            </p>
            <p className="font-medium text-alpha-deep">
              {analysis.fundamentals.sector} • {analysis.fundamentals.industry}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-alpha-border shadow-sm min-h-[500px]">
          <h3 className="text-lg font-semibold text-alpha-deep mb-6 flex items-center">
            <Activity className="mr-2 text-alpha-primary" size={20} />
            Price Action (Candlestick)
          </h3>
          <div className="h-[400px] w-full">
            {history.length > 0 ? (
              <div style={{ width: "100%", height: "100%" }}>
                <CandlestickChart
                  data={history.map((d) => ({
                    ...d,
                    date: new Date(d.date),
                  }))}
                  width={800}
                  height={400}
                  ratio={1}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-alpha-muted">
                Loading Chart Data...
              </div>
            )}
          </div>
        </div>

        {/* News Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-alpha-border shadow-sm">
          <h3 className="text-lg font-semibold text-alpha-deep mb-4">
            Latest Market News
          </h3>
          <div className="space-y-4">
            {news.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-xl hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
              >
                <div className="flex justify-between items-start">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="group font-medium text-lg text-blue-600 hover:text-blue-800 hover:underline transition-colors flex-1 flex items-start gap-2"
                  >
                    {item.title}
                    <ExternalLink
                      size={16}
                      className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </a>
                  <span
                    className={`text-xs px-2 py-1 rounded-lg ml-2 whitespace-nowrap ${
                      item.sentiment === "Positive"
                        ? "bg-green-100 text-green-700"
                        : item.sentiment === "Negative"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.sentiment}
                  </span>
                </div>
                <div className="flex items-center text-xs text-alpha-muted mt-2 space-x-3">
                  <span className="font-semibold text-gray-600">
                    {item.source}
                  </span>
                  <span>•</span>
                  <span>{new Date(item.pubDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {news.length === 0 && (
              <p className="text-alpha-muted text-center py-4">
                No recent news found.
              </p>
            )}
          </div>
        </div>

        {/* AI Insight Card */}
        <div className="bg-white p-6 rounded-2xl border border-alpha-border shadow-sm space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <Brain className="text-alpha-primary" size={24} />
            <h3 className="text-lg font-semibold text-alpha-deep">
              AI Reasoning
            </h3>
          </div>

          {analysis ? (
            <>
              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-alpha-muted">RSI (14)</span>
                  <span
                    className={`font-mono font-medium ${analysis.rsi > 70 ? "text-alpha-danger" : analysis.rsi < 30 ? "text-alpha-success" : "text-alpha-deep"}`}
                  >
                    {analysis.rsi}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-alpha-muted">SMA (50)</span>
                  <span className="font-mono font-medium text-alpha-deep">
                    ₹{analysis.sma_50}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {analysis.reasoning.map((reason, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2 text-sm text-alpha-body"
                  >
                    <AlertTriangle
                      size={16}
                      className="text-yellow-500 mt-0.5 flex-shrink-0"
                    />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-alpha-muted text-sm">Analysis unavailable</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StockDetails
