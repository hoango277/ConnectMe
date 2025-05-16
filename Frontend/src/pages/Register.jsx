"use client"

import { useState, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { authService } from "../services/authService"
import { uploadService } from "../services/uploadService"
import { ArrowLeft, User, Mail, UserCircle, Lock, Image, UserPlus } from "lucide-react"

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullName: "",
    password: "",
    avatar: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const [avatarPreview, setAvatarPreview] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAvatarChange = async (e) => 
  {
    const file = e.target.files[0]
    if (!file) 
        return

    setIsUploading(true)
    setError(null)
    setAvatarPreview(URL.createObjectURL(file))

    try 
    {
      const url = await uploadService.uploadImage(file)
      setFormData((prev) => 
        (
          {
            ...prev,
            avatar: url || "",
          }
        )
      )
    } 
    catch (error) 
    {
      setError("Tải ảnh đại diện thất bại. Vui lòng thử lại.")
      setAvatarPreview("")
      setFormData((prev) => 
        (
          {
            ...prev,
            avatar: "",
          }
        )
      )

      if (fileInputRef.current)
        fileInputRef.current.value = null
    } 
    finally 
    {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await authService.register(formData)
      if (response.code === 0) {
        // Chuyển hướng đến trang đăng nhập sau khi đăng ký thành công
        navigate("/login", {
          state: {
            message: "Đăng ký thành công! Vui lòng đăng nhập với tài khoản của bạn.",
            username: formData.username
          }
        })
      } else {
        setError(response.message || "Đăng ký thất bại. Vui lòng thử lại.")
      }
    } catch (err) {
      console.error("Registration error:", err)
      setError(err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} className="mr-1" />
            Quay lại
          </button>
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-2 overflow-hidden">
              <img src={"/logo.png"} alt="ConnectMe Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold text-lg">ConnectMe</span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Đăng ký tài khoản</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium flex items-center">
                <User size={16} className="mr-2 text-muted-foreground" />
                Tên đăng nhập
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="Nhập tên đăng nhập của bạn"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium flex items-center">
                <Mail size={16} className="mr-2 text-muted-foreground" />
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="Nhập địa chỉ email của bạn"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium flex items-center">
                <UserCircle size={16} className="mr-2 text-muted-foreground" />
                Họ và tên
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="Nhập họ và tên đầy đủ của bạn"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium flex items-center">
                <Lock size={16} className="mr-2 text-muted-foreground" />
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="Tạo mật khẩu của bạn"
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">Mật khẩu phải có ít nhất 8 ký tự</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="avatar" className="text-sm font-medium flex items-center">
                <Image size={16} className="mr-2 text-muted-foreground" />
                Ảnh đại diện (Tùy chọn)
              </label>
              <input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
              {
                isUploading && 
                (
                  <div className="text-xs text-muted-foreground">Đang tải ảnh lên...</div>
                )
              }
              {
                avatarPreview && 
                (
                  <div className="mt-2 flex justify-center">
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-20 h-20 rounded-full object-cover border"
                    />
                    <button
                      type="button"
                      onClick={() => 
                        {
                          setAvatarPreview("")
                          setFormData((prev) => ({...prev, avatar: ""}))
                          if (fileInputRef.current) 
                            fileInputRef.current.value = null
                        }
                      }
                      className="flex items-center justify-center w-5 h-5 ml-2 bg-red-100 border border-red-200 text-red-500 rounded-full hover:bg-red-200 hover:border-red-400 transition"
                      title="Xóa ảnh"
                    >
                      <span className="text-sm font-bold leading-none">✖</span>
                    </button>
                  </div>
                )
              }
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <>
                    <UserPlus size={18} className="mr-2" />
                    Đăng ký tài khoản
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} ConnectMe. Mọi quyền được bảo lưu.
        </div>
      </div>
    </div>
  )
}

export default Register
