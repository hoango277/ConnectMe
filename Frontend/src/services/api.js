import axios from "axios"

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
  withCredentials: true, // Important for handling cookies
  headers: {
    "Content-Type": "application/json",
  },
})

// Storage key for authentication status
const AUTH_STORAGE_KEY = "auth_redirect_needed"

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Lấy URL của request gây lỗi
    const requestUrl = error.config?.url;
    
    // Chỉ xử lý lỗi 401 nếu không phải từ API kiểm tra profile
    if (error.response?.status === 401 && 
        !window.location.pathname.includes('/login') &&
        !requestUrl.includes('/api/users/me')) {
      // Clear user data
      localStorage.removeItem("user")
      
      // Show alert and set a flag in localStorage that we need to redirect
      alert("Your session has expired or you are not authorized. Please login again.")
      
      // Instead of directly using window.location.href, we'll set a flag
      // This allows React Router to handle the navigation properly
      localStorage.setItem(AUTH_STORAGE_KEY, "true")
      
      // Let the AuthContext handle the redirect with navigate
      window.dispatchEvent(new Event("auth:expired"))
    }
    return Promise.reject(error)
  }
)

export const api = {
  get: (url, config = {}) => axiosInstance.get(url, config),
  post: (url, data, config = {}) => axiosInstance.post(url, data, config),
  put: (url, data, config = {}) => axiosInstance.put(url, data, config),
  delete: (url, config = {}) => axiosInstance.delete(url, config),
  setAuthToken: (token) => {
    if (token) {
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`
    } else {
      delete axiosInstance.defaults.headers.common.Authorization
    }
  },
  // Helper to check if auth redirect is needed
  isAuthRedirectNeeded: () => {
    const needed = localStorage.getItem(AUTH_STORAGE_KEY) === "true"
    if (needed) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
    return needed
  }
}
