import React, { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import {
  ArrowUp,
  ArrowDown,
  Activity,
  Brain,
  AlertTriangle,
  ExternalLink,
  Loader2,
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
  reasoning: string[] // This can now contain Markdown strings
  summary_md?: string // Optional field for a full markdown report
  sentiment_score?: number
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
        const [histData, analysisData, newsData] = await Promise.all([
          api.get<StockHistory[]>(`/stock/${ticker}/history`),
          api.get<StockAnalysis>(`/stock/${ticker}/analysis`),
          api.get<NewsItem[]>(`/news/${ticker}`),
        ])

        setHistory(histData || [])
        setAnalysis(analysisData)
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
      <div className="flex flex-col items-center justify-center h-[60vh] text-alpha-muted animate-pulse">
        <Loader2 className="animate-spin mb-4 text-alpha-primary" size={40} />
        <p className="text-lg font-medium">Crunching Real-time Data...</p>
      </div>
    )
  }

  const getSignalColor = (signal: string) => {
    if (signal === "BUY") return "text-green-600 bg-green-50"
    if (signal === "SELL") return "text-red-600 bg-red-50"
    return "text-yellow-600 bg-yellow-50"
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {ticker}
          </h1>
          <p className="text-slate-500 font-medium flex items-center gap-2">
            <Activity size={16} /> Technical & Sentimental Analysis
          </p>
        </div>
        {analysis && (
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm text-slate-400 uppercase font-bold tracking-wider">
                Current Price
              </div>
              <div className="text-3xl font-black text-slate-900">
                ₹{analysis.current_price.toLocaleString()}
              </div>
            </div>
            <div
              className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${getSignalColor(analysis.signal)}`}
            >
              {analysis.signal === "BUY" && (
                <ArrowUp size={24} strokeWidth={3} />
              )}
              {analysis.signal === "SELL" && (
                <ArrowDown size={24} strokeWidth={3} />
              )}
              <span className="font-black text-xl">{analysis.signal}</span>
            </div>
          </div>
        )}
      </div>

      {/* Fundamentals Grid */}
      {analysis?.fundamentals && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              label: "Market Cap",
              value: formatCurrency(analysis.fundamentals.market_cap),
            },
            { label: "P/E Ratio", value: analysis.fundamentals.pe_ratio },
            {
              label: "52W High",
              value: `₹${analysis.fundamentals.fifty_two_week_high}`,
              color: "text-green-600",
            },
            {
              label: "52W Low",
              value: `₹${analysis.fundamentals.fifty_two_week_low}`,
              color: "text-red-600",
            },
            {
              label: "Sector",
              value: analysis.fundamentals.sector,
              span: "col-span-2",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm ${stat.span || ""}`}
            >
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                {stat.label}
              </p>
              <p
                className={`font-bold truncate ${stat.color || "text-slate-700"}`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Activity className="text-blue-500" size={20} /> Price Action
            </h3>
            <div className="h-[450px] w-full">
              {history.length > 0 ? (
                <CandlestickChart
                  data={history.map((d) => ({ ...d, date: new Date(d.date) }))}
                  width={800}
                  height={450}
                  ratio={1}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  No chart data available
                </div>
              )}
            </div>
          </div>

          {/* Markdown-ready News Section */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Latest Market Intel
            </h3>
            <div className="divide-y divide-gray-50">
              {news.map((item, index) => (
                <div key={index} className="py-4 first:pt-0 last:pb-0 group">
                  <div className="flex justify-between items-start gap-4">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1"
                    >
                      <h4 className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors leading-snug text-lg">
                        {item.title}
                      </h4>
                    </a>
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${
                        item.sentiment === "Positive"
                          ? "bg-green-100 text-green-700"
                          : item.sentiment === "Negative"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.sentiment}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="font-bold text-slate-500">
                      {item.source}
                    </span>
                    <span>•</span>
                    <span>{new Date(item.pubDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insight Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <Brain className="text-blue-400" size={24} />
                <h3 className="text-xl font-bold">AI Analysis</h3>
              </div>

              {analysis ? (
                <div className="space-y-6">
                  {/* Sentiment Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Market Sentiment</span>
                      <span className="font-black text-blue-400">
                        {analysis.sentiment_score}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                        style={{ width: `${analysis.sentiment_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Technical Indicators */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">
                        RSI (14)
                      </p>
                      <p className="text-lg font-mono font-bold">
                        {analysis.rsi}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">
                        SMA (50)
                      </p>
                      <p className="text-lg font-mono font-bold">
                        ₹{analysis.sma_50}
                      </p>
                    </div>
                  </div>

                  {/* Enhanced Key Drivers with Markdown */}
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Logic & Reasoning
                    </p>
                    {analysis.reasoning.map((reason, idx) => (
                      <div
                        key={idx}
                        className="flex gap-3 text-sm leading-relaxed border-l-2 border-slate-700 pl-4 py-1"
                      >
                        <div className="prose prose-invert prose-sm">
                          <ReactMarkdown>{reason}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 py-10 text-center italic">
                  No analysis generated
                </div>
              )}
            </div>
            {/* Background Decoration */}
            <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
          </div>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
            <p className="text-[11px] text-amber-800 leading-tight">
              AI analysis is based on historical data and current news
              sentiment. This is not financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const formatCurrency = (val: string) => {
  const cap = parseFloat(val)
  if (isNaN(cap)) return val
  if (cap >= 1.0e12) return `₹${(cap / 1.0e12).toFixed(2)}T`
  if (cap >= 1.0e9) return `₹${(cap / 1.0e9).toFixed(2)}B`
  if (cap >= 1.0e7) return `₹${(cap / 1.0e7).toFixed(2)}Cr`
  return `₹${cap.toLocaleString()}`
}

export default StockDetails
