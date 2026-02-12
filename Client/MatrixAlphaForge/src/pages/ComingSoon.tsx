import React from "react"
import { Construction } from "lucide-react"
import { Link } from "react-router-dom"

const ComingSoon = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center">
      <div className="bg-alpha-primary/10 p-6 rounded-full mb-6 animate-pulse">
        <Construction size={64} className="text-alpha-primary" />
      </div>
      <h1 className="text-4xl font-bold text-alpha-deep mb-2">
        Work in Progress
      </h1>
      <p className="text-alpha-muted max-w-md mb-8">
        This feature is currently being engineered by our team. Check back soon
        for updates.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-alpha-primary text-white rounded-xl font-medium hover:bg-alpha-primary-dark transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  )
}

export default ComingSoon
