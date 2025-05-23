"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { api } from "../services/api"
import { useNavigate } from "react-router-dom"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Listen for auth:expired events from the API interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      setCurrentUser(null)
      setIsAuthenticated(false)

      // Use navigate from react-router to redirect
      navigate("/login")
    }

    window.addEventListener("auth:expired", handleAuthExpired)

    return () => {
      window.removeEventListener("auth:expired", handleAuthExpired)
    }
  }, [navigate])

  // Check on app startup if we need to redirect due to a previous auth error
  useEffect(() => {
    if (api.isAuthRedirectNeeded()) {
      navigate("/login")
    }
  }, [navigate])

  useEffect(() => {
    // fetch user on startup via cookie
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await api.get("/api/users/me")
      const payload = response.data.result || response.data
      const user = payload.user || payload
      setCurrentUser(user)
      setIsAuthenticated(true)
    } catch (error) {
      // no valid session cookie
      console.error("Failed to fetch user profile:", error)
      setCurrentUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    setError(null)
    try {
      const response = await api.post("/api/auth/login", { username, password })
      // cookie 'jwt' is set by backend
      const payload = response.data.result || response.data
      const user = payload.user || payload
      setCurrentUser(user)
      setIsAuthenticated(true)
      return true
    } catch (error) {
      setError(error.response?.data?.message || "Login failed")
      return false
    }
  }

  const register = async (userData) => {
    setError(null)
    try {

      const response = await api.post("/api/auth/register", userData)

      return {
        success: true,
        message: response.data?.message || "Registration successful",
      }
    } catch (error) {
      setError(error.response?.data?.message || "Registration failed")
      return { success: false, message: error.response?.data?.message || "Registration failed" }
    }
  }

  const logout = async () => {
    try {
      await api.post("/api/auth/logout") // backend clears cookie
    } catch { } finally {
      setCurrentUser(null)
      setIsAuthenticated(false)
      // Use navigate in the context
      navigate("/login")
    }
  }

  const updateProfile = async (userData) => {
    try {
      // For testing in development
      if (import.meta.env.DEV && !import.meta.env.VITE_API_STRICT_MODE) {
        console.warn("Using mock profile update in development mode")
        setCurrentUser(prevUser => ({
          ...prevUser,
          ...userData
        }))
        return { ...currentUser, ...userData }
      }

      const response = await api.put("/api/users/me", userData)
      setCurrentUser(response.data)
      return response.data
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update profile")
      throw error
    }
  }

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}