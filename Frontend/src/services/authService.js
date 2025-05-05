import { api } from "./api"

export const authService = {
  // Register a new user
  register: async (userData) => {
    try {
      const response = await api.post("/api/auth/register", userData)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      const response = await api.post("/api/auth/login", credentials)
      // The backend sets the JWT cookie automatically
      console.log(response.data);
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get current user info from API
  getCurrentUser: async () => {
    try {
      const response = await api.get("/api/users/me")
      return response.data
    } catch (error) {
      throw error
    }
  }
} 