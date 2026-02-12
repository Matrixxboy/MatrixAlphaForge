import React, { useState } from "react"
import {
  Shield,
  AlertTriangle,
  PieChart as PieIcon,
  Plus,
  Trash2,
} from "lucide-react"

interface PortfolioItem {
  ticker: string
  weight: number
}

interface RiskMetrics {
  volatility: number
  beta: number
  sharpe_ratio: number
  var_95: number
}

const RiskPage = () => {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([
    { ticker: "", weight: 0 },
  ])
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null)
  const [loading, setLoading] = useState(false)

  const addRow = () => setPortfolio([...portfolio, { ticker: "", weight: 0 }])
  const removeRow = (index: number) =>
    setPortfolio(portfolio.filter((_, i) => i !== index))

  const updateRow = (
    index: number,
    field: keyof PortfolioItem,
    value: string | number,
  ) => {
    const newPortfolio = [...portfolio]
    newPortfolio[index] = { ...newPortfolio[index], [field]: value }
    setPortfolio(newPortfolio)
  }

  const calculateRisk = async () => {
    setLoading(true)
    try {
      const validPortfolio = portfolio.filter((p) => p.ticker && p.weight > 0)
      const res = await fetch(
        "http://127.0.0.1:8000/api/stock/risk/calculate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ portfolio: validPortfolio }),
        },
      )
      if (res.ok) {
        setMetrics(await res.json())
      }
    } catch (e) {
      console.error("Risk calc failed", e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-alpha-deep">Risk Management</h1>
        <p className="text-alpha-muted">
          Analyze your portfolio's exposure and volatility.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Portfolio Input */}
        <div className="bg-white p-6 rounded-2xl border border-alpha-border shadow-sm">
          <h3 className="text-lg font-semibold text-alpha-deep mb-4 flex items-center">
            <PieIcon className="mr-2 text-alpha-primary" size={20} />
            Portfolio Composition
          </h3>

          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-alpha-muted uppercase">
              <div className="col-span-6">Ticker</div>
              <div className="col-span-4">Weight (%)</div>
              <div className="col-span-2"></div>
            </div>
            {portfolio.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <input
                    type="text"
                    placeholder="e.g. RELIANCE.NS"
                    className="w-full p-2 bg-gray-50 rounded-lg border border-alpha-border focus:ring-2 ring-alpha-primary/20 outline-none uppercase text-sm"
                    value={item.ticker}
                    onChange={(e) => updateRow(index, "ticker", e.target.value)}
                  />
                </div>
                <div className="col-span-4">
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full p-2 bg-gray-50 rounded-lg border border-alpha-border focus:ring-2 ring-alpha-primary/20 outline-none text-sm"
                    value={item.weight || ""}
                    onChange={(e) =>
                      updateRow(index, "weight", parseFloat(e.target.value))
                    }
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                  <button
                    onClick={() => removeRow(index)}
                    className="text-alpha-danger hover:bg-red-50 p-2 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={addRow}
              className="flex items-center px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-alpha-deep rounded-xl transition-colors"
            >
              <Plus size={16} className="mr-1" /> Add Asset
            </button>
            <button
              onClick={calculateRisk}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-alpha-primary hover:bg-alpha-primary-dark text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Calculating..." : "Run Simulation"}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {metrics && (
            <div className="bg-white p-6 rounded-2xl border border-alpha-border shadow-sm">
              <h3 className="text-lg font-semibold text-alpha-deep mb-6 flex items-center">
                <Shield className="mr-2 text-alpha-success" size={20} />
                Risk Analysis Results
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-alpha-muted text-xs uppercase font-bold tracking-wider mb-1">
                    Portfolio Volatility
                  </div>
                  <div className="text-2xl font-bold text-alpha-deep">
                    {metrics.volatility}%
                  </div>
                  <div className="text-xs text-alpha-muted mt-1">
                    Annualized Standard Deviation
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-alpha-muted text-xs uppercase font-bold tracking-wider mb-1">
                    Beta
                  </div>
                  <div className="text-2xl font-bold text-alpha-deep">
                    {metrics.beta}
                  </div>
                  <div className="text-xs text-alpha-muted mt-1">
                    vs Nifty 50
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-alpha-muted text-xs uppercase font-bold tracking-wider mb-1">
                    Sharpe Ratio
                  </div>
                  <div className="text-2xl font-bold text-alpha-deep">
                    {metrics.sharpe_ratio}
                  </div>
                  <div className="text-xs text-alpha-muted mt-1">
                    Risk-Adjusted Return
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-alpha-muted text-xs uppercase font-bold tracking-wider mb-1">
                    VaR (95%)
                  </div>
                  <div className="text-2xl font-bold text-alpha-danger">
                    {metrics.var_95}%
                  </div>
                  <div className="text-xs text-alpha-muted mt-1">
                    Value at Risk
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-start p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm">
                <AlertTriangle
                  className="mr-2 flex-shrink-0 mt-0.5"
                  size={16}
                />
                <p>
                  <strong>Risk Warning:</strong> This portfolio has a volatility
                  of {metrics.volatility}%.
                  {metrics.volatility > 20
                    ? " Consider diversifying to reduce risk."
                    : " This is within moderate risk levels."}
                </p>
              </div>
            </div>
          )}

          {!metrics && !loading && (
            <div className="bg-gray-50 p-8 rounded-2xl border border-dashed border-alpha-border flex flex-col items-center justify-center text-center text-alpha-muted h-64">
              <Shield size={48} className="mb-4 opacity-20" />
              <p>Add assets and run simulation to view risk metrics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RiskPage
