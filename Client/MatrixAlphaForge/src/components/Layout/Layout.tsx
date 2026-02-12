import React from "react"
import {
  Home,
  LineChart,
  Shield,
  Brain,
  Settings,
  Menu,
  Search,
  Bell,
} from "lucide-react"
import { Link } from "react-router-dom"

interface LayoutProps {
  children: React.ReactNode
}

const SidebarItem = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex items-center space-x-3 p-3 rounded-xl text-alpha-muted hover:bg-alpha-primary/5 hover:text-alpha-primary cursor-pointer transition-all group">
    <Icon size={20} className="group-hover:scale-110 transition-transform" />
    <span className="font-medium">{label}</span>
  </div>
)

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8F9FC] flex font-sans text-alpha-body">
      {/* Sidebar */}
      <aside className="w-64 bg-alpha-surface border-r border-alpha-border fixed h-full hidden md:flex flex-col p-6 z-20">
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-alpha-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-alpha-primary/20">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <span className="text-xl font-bold text-alpha-deep tracking-tight">
            Matrix<span className="text-alpha-primary">Forge</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          <div className="text-xs font-semibold text-alpha-muted uppercase tracking-wider mb-4 px-4">
            Platform
          </div>
          <Link to="/">
            <SidebarItem icon={Home} label="Overview" />
          </Link>
          <Link to="/analysis">
            <SidebarItem icon={LineChart} label="Market Analysis" />
          </Link>
          <Link to="/risk">
            <SidebarItem icon={Shield} label="Risk Management" />
          </Link>
          <Link to="/ai">
            <SidebarItem icon={Brain} label="AI Insights" />
          </Link>

          <div className="text-xs font-semibold text-alpha-muted uppercase tracking-wider mb-4 mt-8 px-4">
            Settings
          </div>
          <Link to="/admin">
            <SidebarItem icon={Settings} label="Admin Panel" />
          </Link>
          <SidebarItem icon={Settings} label="Configuration" />
        </nav>

        <div className="mt-auto pt-6 border-t border-alpha-border">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"></div>
            <div>
              <p className="text-sm font-medium text-alpha-deep">
                Alpha Trader
              </p>
              <p className="text-xs text-alpha-muted">Pro Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 bg-alpha-surface/80 backdrop-blur-md border-b border-alpha-border sticky top-0 z-10 px-6 flex items-center justify-between">
          <div className="md:hidden">
            <button className="p-2 text-alpha-deep">
              <Menu size={24} />
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-alpha-muted"
                size={18}
              />
              <input
                type="text"
                placeholder="Search assets, symbols, or analysis..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-alpha-border rounded-xl focus:outline-none focus:ring-2 focus:ring-alpha-primary/20 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4 pl-4">
            <button className="p-2 text-alpha-muted hover:text-alpha-deep relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-alpha-danger rounded-full border border-white"></span>
            </button>
            <button className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-alpha-primary/10 text-alpha-primary rounded-lg text-sm font-medium">
              <span>Live Market</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

export default Layout
