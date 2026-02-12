const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"

interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: {
    type: string
    details: any
    location?: string
  }
  meta?: any
}

export const api = {
  get: async <T>(endpoint: string): Promise<T> => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`)
      const json: ApiResponse<T> = await response.json()

      if (!response.ok || !json.success) {
        throw new Error(json.message || "API Request Failed")
      }
      return json.data as T
    } catch (error) {
      console.error(`API GET ${endpoint} failed:`, error)
      throw error
    }
  },

  post: async <T>(endpoint: string, body: any): Promise<T> => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json: ApiResponse<T> = await response.json()

      if (!response.ok || !json.success) {
        throw new Error(json.message || "API Request Failed")
      }
      return json.data as T
    } catch (error) {
      console.error(`API POST ${endpoint} failed:`, error)
      throw error
    }
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "DELETE",
      })
      const json: ApiResponse<T> = await response.json()

      if (!response.ok || !json.success) {
        throw new Error(json.message || "API Request Failed")
      }
      return json.data as T
    } catch (error) {
      console.error(`API DELETE ${endpoint} failed:`, error)
      throw error
    }
  },
}
