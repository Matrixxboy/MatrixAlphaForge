import React, { useState, useEffect } from "react"
import { Plus, Trash2, AlertCircle, RefreshCw } from "lucide-react"

interface WatchlistItem {
  id: number
  symbol: string
  price: number
  change: number
}

const AdminPanel = () => {
  const [ticker, setTicker] = useState("")
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWatchlist = async () => {
    setLoading(true)
    try {
      const response = await fetch("http://127.0.0.1:8000/api/stock/watchlist")
      if (response.ok) {
        setWatchlist(await response.json())
        setError(null)
      } else {
        setError("Failed to fetch watchlist.")
      }
    } catch (error) {
      setError("Server unreachable.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWatchlist()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker) return

    // Auto-append .NS if missing for convenience, though user should ideally control this.
    const formattedTicker =
      ticker.toUpperCase().endsWith(".NS") ||
      ticker.toUpperCase().endsWith(".BO")
        ? ticker
        : `${ticker}.NS`

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/stock/watchlist",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: formattedTicker }),
        },
      )

      if (response.ok) {
        setTicker("")
        fetchWatchlist()
      } else {
        const errData = await response.json()
        setError(errData.detail || "Failed to add ticker")
      }
    } catch (error) {
      setError("Connection failed")
    }
  }

  const handleDelete = async (tickerToDelete: string) => {
    try {
      await fetch(
        `http://127.0.0.1:8000/api/stock/watchlist/${tickerToDelete}`,
        {
          method: "DELETE",
        },
      )
      fetchWatchlist()
    } catch (error) {
      setError("Failed to delete")
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-alpha-deep">
          Admin Control Center
        </h2>
        <p className="text-alpha-muted">
          Manage tracked assets and system configuration.
        </p>
      </div>

      {/* Add Ticker Card */}
      <div className="bg-white p-6 rounded-2xl border border-alpha-border shadow-sm">
        <h3 className="text-lg font-semibold text-alpha-deep mb-4">
          Add to Watchlist
        </h3>
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Enter Symbol (e.g. RELIANCE, TATAMOTORS)"
            className="flex-1 px-4 py-2 border border-alpha-border rounded-xl focus:outline-none focus:ring-2 focus:ring-alpha-primary/20 text-alpha-deep"
          />
          <button
            type="submit"
            className="flex items-center space-x-2 bg-alpha-primary text-white px-6 py-2 rounded-xl hover:bg-opacity-90 transition-colors font-medium"
          >
            <Plus size={20} />
            <span>Add Stock</span>
          </button>
        </form>
        {error && (
          <div className="flex items-center space-x-2 text-alpha-danger mt-3 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Watchlist Table */}
      <div className="bg-white p-6 rounded-2xl border border-alpha-border shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-alpha-deep">
            Active Watchlist
          </h3>
          <button
            onClick={fetchWatchlist}
            className="text-alpha-primary hover:bg-alpha-primary/10 p-2 rounded-lg transition-colors"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-alpha-border text-alpha-muted text-sm uppercase tracking-wider">
                <th className="pb-3 pl-4">Symbol</th>
                <th className="pb-3">Live Price</th>
                <th className="pb-3">Change %</th>
                <th className="pb-3 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-alpha-border">
              {watchlist.map((item) => (
                <tr
                  key={item.id}
                  className="group hover:bg-alpha-primary/5 transition-colors"
                >
                  <td className="py-4 pl-4 font-mono font-medium text-alpha-deep">
                    {item.symbol}
                  </td>
                  <td className="py-4 font-mono text-alpha-deep">
                    ₹{item.price.toFixed(2)}
                  </td>
                  <td
                    className={`py-4 font-mono font-medium ${item.change >= 0 ? "text-alpha-success" : "text-alpha-danger"}`}
                  >
                    {item.change > 0 ? "+" : ""}
                    {item.change.toFixed(2)}%
                  </td>
                  <td className="py-4 text-right pr-4">
                    <button
                      onClick={() => handleDelete(item.symbol)}
                      className="text-alpha-muted hover:text-alpha-danger p-2 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {watchlist.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-alpha-muted">
                    No stocks in watchlist. Add one to begin tracking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
