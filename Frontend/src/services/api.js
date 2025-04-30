import axios from "axios"

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
  withCredentials: true, // Important for handling cookies
  headers: {
    "Content-Type": "application/json",
  },
})

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Clear user data and redirect to login
      localStorage.removeItem("user")
      window.location.href = "/login"
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
}
