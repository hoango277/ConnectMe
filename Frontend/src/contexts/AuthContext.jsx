"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { api } from "../services/api"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token")
    if (token) {
      fetchUserProfile(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserProfile = async (token) => {
    try {
      api.setAuthToken(token)
      const response = await api.get("/api/users/me")
      setCurrentUser(response.data)
      setIsAuthenticated(true)
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
      localStorage.removeItem("token")
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    setError(null)
    try {
      // For testing purposes, allow mock login when backend isn't available
      if (import.meta.env.DEV && !import.meta.env.VITE_API_STRICT_MODE) {
        console.warn("Using mock login in development mode")
        const mockUser = { id: "mock-user-1", name: "Test User", email: email }
        const mockToken = "mock-token-for-development"
        
        localStorage.setItem("token", mockToken)
        api.setAuthToken(mockToken)
        
        setCurrentUser(mockUser)
        setIsAuthenticated(true)
        return true
      }
      
      // Normal authentication flow
      const response = await api.post("/api/auth/login", { username: email, password })
      console.log(response);
      const { token, user } = response.data.result

      localStorage.setItem("token", token)
      api.setAuthToken(token)

      setCurrentUser(user)
      setIsAuthenticated(true)
      return true
    } catch (error) {
      // For development, when no backend is available
      if (import.meta.env.DEV && !import.meta.env.VITE_API_STRICT_MODE) {
        console.warn("Using mock login in development mode")
        const mockUser = { id: "mock-user-1", name: "Test User", email: email }
        const mockToken = "mock-token-for-development"
        
        localStorage.setItem("token", mockToken)
        api.setAuthToken(mockToken)
        
        setCurrentUser(mockUser)
        setIsAuthenticated(true)
        return true
      }
      
      setError(error.response?.data?.message || "Login failed")
      return false
    }
  }

  const register = async (userData) => {
    setError(null)
    try {
      // For testing purposes in development
      if (import.meta.env.DEV && !import.meta.env.VITE_API_STRICT_MODE) {
        console.warn("Using mock registration in development mode")
        return { success: true, message: "Registration successful" }
      }
      
      const response = await api.post("/api/auth/register", userData)
      return response.data
    } catch (error) {
      setError(error.response?.data?.message || "Registration failed")
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    api.setAuthToken(null)
    setCurrentUser(null)
    setIsAuthenticated(false)
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
