import axios from "axios"

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8080"

const instance = axios.create({
  baseURL,
  withCredentials: true,    // send cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
})

// Remove localStorage-based auth header injection, credentials handled by cookie
instance.interceptors.request.handlers = []

// Response interceptor
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

export const api = {
  get: (url, config = {}) => instance.get(url, config),
  post: (url, data, config = {}) => instance.post(url, data, config),
  put: (url, data, config = {}) => instance.put(url, data, config),
  delete: (url, config = {}) => instance.delete(url, config),
  setAuthToken: (token) => {
    if (token) {
      instance.defaults.headers.common.Authorization = `Bearer ${token}`
    } else {
      delete instance.defaults.headers.common.Authorization
    }
  },
}
