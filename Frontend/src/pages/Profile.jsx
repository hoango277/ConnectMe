"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { ArrowLeft, Save } from "lucide-react"
import { api } from "../services/api"

const Profile = () => {
  const navigate = useNavigate()
  const { logout } = useAuth()

  // State cho user info từ API /api/users/me
  const [userInfo, setUserInfo] = useState(null)
  const [userInfoLoading, setUserInfoLoading] = useState(true)
  const [userInfoError, setUserInfoError] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullName: "",
    avatar: ""
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const fileInputRef = useRef()

  useEffect(() => {
    setUserInfoLoading(true)
    api.get("/api/users/me")
      .then((res) => {
        const data = res.data;
        setUserInfo(data.result)
        setFormData({
          username: data.result.username || "",
          email: data.result.email || "",
          fullName: data.result.fullName || "",
          avatar: data.result.avatar || ""
        })
        setAvatarPreview(data.result.avatar || "")
        setUserInfoLoading(false)
      })
      .catch((err) => {
        setUserInfoError("Không thể tải thông tin user")
        setUserInfoLoading(false)
      })
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    try {
      // Chuẩn bị form data
      const form = new FormData()
      form.append("file", avatarFile || new Blob([])) // Nếu không chọn file mới, gửi file rỗng
      form.append("user", JSON.stringify({
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        avatar: ""
      }))
      const res = await api.put("/api/users/update-me", form, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        withCredentials: true
      })
      const data = res.data
      if (data.code === 0) {
        setSuccess("Cập nhật thành công!")
        setUserInfo(data.result)
        setFormData({
          username: data.result.username || "",
          email: data.result.email || "",
          fullName: data.result.fullName || "",
          avatar: data.result.avatar || ""
        })
        setAvatarPreview(data.result.avatar || "")
        setAvatarFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
      } else {
        setError(data.message || "Cập nhật thất bại")
      }
    } catch (err) {
      setError("Cập nhật thất bại")
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
                <label htmlFor="username" className="text-sm font-medium">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  className="input"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Avatar</label>
                <div className="flex items-center gap-4">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" width={60} height={60} style={{borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee'}} />
                  ) : (
                    <span>Chưa có</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    ref={fileInputRef}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Trạng thái</label>
                <input
                  type="text"
                  value={userInfo.isActive ? "Đang hoạt động" : "Không hoạt động"}
                  className="input"
                  disabled
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={isLoading}>
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save size={18} />
                      Lưu thay đổi
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
