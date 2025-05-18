"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { ArrowLeft, Save } from "lucide-react"
import { api } from "../services/api"
import { uploadService } from "../services/uploadService"  // import uploadService

const Profile = () => {
  const navigate = useNavigate()
  const { logout } = useAuth()

  // State cho user info từ API
  const [userInfo, setUserInfo] = useState(null)
  const [userInfoLoading, setUserInfoLoading] = useState(true)
  const [userInfoError, setUserInfoError] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullName: "",
    avatar: ""      // URL avatar
  })
  const [avatarPreview, setAvatarPreview] = useState("") // để hiển thị
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const fileInputRef = useRef()

  // Lấy thông tin user khi mount
  useEffect(() => {
    setUserInfoLoading(true)
    api.get("/api/users/me")
      .then((res) => {
        const data = res.data.result
        setUserInfo(data)
        setFormData({
          username: data.username || "",
          email: data.email || "",
          fullName: data.fullName || "",
          avatar: data.avatar || ""
        })
        setAvatarPreview(data.avatar || "")
      })
      .catch(() => {
        setUserInfoError("Không thể tải thông tin user")
      })
      .finally(() => {
        setUserInfoLoading(false)
      })
  }, [])

  // Xử lý khi chọn file avatar
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      // Gọi uploadService để upload và lấy URL
      const { result: url } = await uploadService.uploadImage(file)

      // Cập nhật URL vào formData và preview
      setFormData(prev => ({ ...prev, avatar: url || "" }))
      setAvatarPreview(url || "")
    } catch (err) {
      console.error(err)
      setError("Tải ảnh đại diện thất bại. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
      // reset input để có thể chọn lại file cùng tên
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Biến để hiển thị avatar (ưu tiên preview mới)
  const displayAvatar = avatarPreview || formData.avatar

  // Xử lý input text/email/fullName
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Submit form chỉ gửi JSON user (backend sẽ lấy avatar URL từ JSON)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const form = new FormData()
      form.append(
        "user",
        new Blob([JSON.stringify(formData)], { type: "application/json" })
      )

      const res = await api.put("/api/users/update-me", form, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      })

      const data = res.data
      if (data.code === 0) {
        setSuccess("Cập nhật thành công!")
        const u = data.result
        setUserInfo(u)
        setFormData({
          username: u.username,
          email: u.email,
          fullName: u.fullName,
          avatar: u.avatar
        })
        setAvatarPreview(u.avatar)
      } else {
        setError(data.message || "Cập nhật thất bại")
      }
    } catch (err) {
      console.error(err)
      setError("Cập nhật thất bại. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  if (userInfoLoading) return <div className="p-8">Đang tải...</div>
  if (userInfoError) return <div className="p-8 text-red-500">{userInfoError}</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} className="mr-1" /> Back
      </button>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Profile Settings</h1>
        <p className="text-muted-foreground mb-6">Manage your account information</p>

        {error   && <div className="bg-red-100 text-red-600 p-4 rounded-md mb-6">{error}</div>}
        {success && <div className="bg-green-100 text-green-800 p-4 rounded-md mb-6">{success}</div>}

        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div className="space-y-1">
                <label htmlFor="username" className="text-sm font-medium text-gray-700">Username</label>
                <input
                  id="username" name="username" type="text"
                  value={formData.username}
                  disabled
                  className="w-full px-4 py-2 border rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                <input
                  id="email" name="email" type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label htmlFor="fullName" className="text-sm font-medium text-gray-700">Full Name</label>
                <input
                  id="fullName" name="fullName" type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Avatar */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Avatar</label>
                <div className="flex items-center gap-4">
                  {displayAvatar
                    ? <img src={displayAvatar} alt="avatar" className="w-16 h-16 rounded-full object-cover border" />
                    : <div className="w-16 h-16 flex items-center justify-center bg-gray-100 border rounded-full text-sm text-gray-400">No Img</div>
                  }
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    ref={fileInputRef}
                    disabled={isLoading}
                    className="block w-full text-sm text-gray-500
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-full file:border-0
                               file:bg-blue-50 file:text-blue-700
                               hover:file:bg-blue-100"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-md flex items-center gap-2 disabled:opacity-60"
                >
                  {isLoading
                    ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white border-b-2" />
                    : <>
                        <Save size={18} />
                        Save
                      </>
                  }
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-6 border-t">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-medium">Account Actions</h3>
                <p className="text-sm text-gray-500">Manage your account status</p>
              </div>
              <button
                onClick={handleLogout}
                className="mt-4 md:mt-0 border border-gray-300 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-md"
              >
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