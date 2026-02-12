import React, { useEffect, useState } from "react"
import { Brain, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react"
import { Link } from "react-router-dom"

interface AISignal {
  ticker: string
  signal: "BUY" | "SELL" | "HOLD"
  rsi: number
  price: number
}

const AIInsightsPage = () => {
  const [retrying, setRetrying] = useState(false)
  const [signals, setSignals] = useState<AISignal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSignals = async () => {
    setLoading(true)

    try {
      const res = await fetch("http://127.0.0.1:8000/api/stock/ai/signals", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error("Server error:", errorText)
        return
      }

      const data = await res.json()
      setSignals(data.data)
    } catch (e) {
      console.error("AI fetch failed:", e)
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    fetchSignals()
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-alpha-deep">AI Insights</h1>
          <p className="text-alpha-muted">
            Algorithmic market scanning and opportunity detection.
          </p>
        </div>
        <button
          onClick={fetchSignals}
          disabled={loading}
          className="p-2 hover:bg-alpha-primary/10 rounded-full transition-colors text-alpha-primary"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Signal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? // Skeletons
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-gray-100 rounded-2xl animate-pulse"
              ></div>
            ))
          : signals.map((signal, i) => (
              <Link to={`/stock/${signal.ticker}`} key={i}>
                <div className="bg-white p-6 rounded-2xl border border-alpha-border hover:shadow-md transition-shadow group relative overflow-hidden">
                  <div
                    className={`absolute top-0 right-0 p-2 text-xs font-bold rounded-bl-xl ${signal.signal === "BUY" ? "bg-green-100 text-green-700" : signal.signal === "SELL" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {signal.signal}
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-alpha-deep">
                      {signal.ticker}
                    </h3>
                    <div className="text-2xl font-semibold mt-1">
                      ₹{signal.price}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-alpha-muted border-t pt-4 border-gray-100">
                    <div className="flex items-center">
                      <span className="mr-2">RSI:</span>
                      <span
                        className={`font-mono font-bold ${signal.rsi > 70 ? "text-red-500" : signal.rsi < 30 ? "text-green-500" : ""}`}
                      >
                        {signal.rsi}
                      </span>
                    </div>
                    <div className="text-alpha-primary flex items-center group-hover:translate-x-1 transition-transform">
                      Analyze <ArrowUpRight size={16} className="ml-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
      </div>

      {!loading && signals.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-alpha-border">
          <Brain
            size={48}
            className="mx-auto text-alpha-muted opacity-30 mb-4"
          />
          <p className="text-alpha-muted">
            No significant signals detected in the scanner.
          </p>
        </div>
      )}
    </div>
  )
}

export default AIInsightsPage
