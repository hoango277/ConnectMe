"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { ArrowLeft, Save } from "lucide-react"

const Profile = () => {
  const navigate = useNavigate()
  const { currentUser, updateProfile, logout } = useAuth()

  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate password fields if changing password
      if (isChangingPassword) {
        if (!formData.currentPassword) {
          throw new Error("Current password is required")
        }

        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error("New passwords do not match")
        }

        if (formData.newPassword && formData.newPassword.length < 6) {
          throw new Error("New password must be at least 6 characters")
        }
      }

      // Prepare data for update
      const updateData = {
        name: formData.name,
      }

      if (isChangingPassword) {
        updateData.currentPassword = formData.currentPassword
        updateData.newPassword = formData.newPassword
      }

      await updateProfile(updateData)
      setSuccess("Profile updated successfully")

      // Reset password fields
      if (isChangingPassword) {
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }))
        setIsChangingPassword(false)
      }
    } catch (err) {
      console.error("Error updating profile:", err)
      setError(err.message || "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account information</p>
          </div>
        </div>

        {error && <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">{error}</div>}

        {success && <div className="bg-green-100 text-green-800 p-4 rounded-md mb-6">{success}</div>}

        <div className="bg-background border rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  disabled
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              {!isChangingPassword ? (
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(true)}
                  className="text-primary hover:underline text-sm"
                >
                  Change password
                </button>
              ) : (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium">Change Password</h3>

                  <div className="space-y-2">
                    <label htmlFor="currentPassword" className="text-sm font-medium">
                      Current Password
                    </label>
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className="input"
                      required={isChangingPassword}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm font-medium">
                      New Password
                    </label>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="input"
                      required={isChangingPassword}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="input"
                      required={isChangingPassword}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(false)}
                    className="text-muted-foreground hover:underline text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={isLoading}>
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-muted p-6 border-t">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-medium">Account Actions</h3>
                <p className="text-sm text-muted-foreground">Manage your account status</p>
              </div>
              <button onClick={handleLogout} className="btn btn-outline mt-4 md:mt-0">
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
