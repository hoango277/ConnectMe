import { authService } from "../services/authService"

export const getCurrentUser = async () => {
  try {
    const response = await authService.getCurrentUser()
    return response.result
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

export const getCurrentUserId = async () => {
  const user = await getCurrentUser()
  return user?.id || null
}

export const isAuthenticated = async () => {
  try {
    await authService.getCurrentUser()
    return true
  } catch (error) {
    return false
  }
} 