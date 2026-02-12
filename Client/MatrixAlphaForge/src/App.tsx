import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "./components/Layout/Layout"
import Dashboard from "./pages/Dashboard"
import AdminPanel from "./pages/AdminPanel"
import StockDetails from "./pages/StockDetails"
import AnalysisPage from "./pages/AnalysisPage"
import RiskPage from "./pages/RiskPage"
import AIInsightsPage from "./pages/AIInsightsPage"

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/stock/:ticker" element={<StockDetails />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/risk" element={<RiskPage />} />
          <Route path="/ai" element={<AIInsightsPage />} />
          <Route
            path="*"
            element={
              <div className="text-center mt-20 text-alpha-muted">
                Page Under Construction
              </div>
            }
          />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

