import React, { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Layers } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { api } from "../services/api"

interface MarketData {
  sectors: { name: string; change: number; performance: string }[]
  movers: {
    gainers: { symbol: string; price: number; change: number }[]
    losers: { symbol: string; price: number; change: number }[]
  }
}

const AnalysisPage = () => {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const marketData = await api.get<MarketData>("/stock/market/analysis")
        setData(marketData)
      } catch (e) {
        console.error("Analysis fetch failed", e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading)
    return (
      <div className="p-10 text-alpha-muted">
        Loading Market Intelligence...
      </div>
    )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-alpha-deep">Market Analysis</h1>
        <p className="text-alpha-muted">
          Sector performance and top market movers.
        </p>
      </div>

      {data && (
        <>
          {/* Sector Performance */}
          <div className="bg-white p-6 rounded-2xl border border-alpha-border shadow-sm">
            <h3 className="text-lg font-semibold text-alpha-deep mb-6 flex items-center">
              <Layers className="mr-2 text-alpha-primary" size={20} />
              Sector Performance
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sectors}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: "transparent" }} />
                  <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                    {data.sectors.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.change >= 0 ? "#10B981" : "#EF4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Movers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Gainers */}
            <div className="bg-white p-6 rounded-2xl border border-alpha-border shadow-sm">
              <h3 className="text-lg font-semibold text-green-600 mb-4 flex items-center">
                <TrendingUp className="mr-2" size={20} />
                Top Gainers
              </h3>
              <div className="space-y-3">
                {data.movers.gainers.map((stock, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 bg-green-50 rounded-xl"
                  >
                    <span className="font-medium text-alpha-deep">
                      {stock.symbol}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-bold">₹{stock.price}</div>
                      <div className="text-xs text-green-600">
                        +{stock.change}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Losers */}
            <div className="bg-white p-6 rounded-2xl border border-alpha-border shadow-sm">
              <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
                <TrendingDown className="mr-2" size={20} />
                Top Losers
              </h3>
              <div className="space-y-3">
                {data.movers.losers.map((stock, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 bg-red-50 rounded-xl"
                  >
                    <span className="font-medium text-alpha-deep">
                      {stock.symbol}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-bold">₹{stock.price}</div>
                      <div className="text-xs text-red-600">
                        {stock.change}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AnalysisPage
