"use client"

import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { ArrowLeft, User, Lock, LogIn } from "lucide-react"

const Login = () => {
  const navigate = useNavigate()
  const { login, error: authError } = useAuth()
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    // Hiệu ứng chào mừng sẽ biến mất sau 1.5 giây
    const timer = setTimeout(() => {
      setShowWelcome(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const success = await login(formData.username, formData.password)
      if (success) {
        navigate("/")
      } else {
        setError(authError || "Đăng nhập thất bại. Vui lòng thử lại.")
      }
    } catch (err) {
      setError(err.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      {showWelcome ? (
        <div className="flex flex-col items-center justify-center animate-fade-in">
          <div className="w-24 h-24 mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold">
            CM
          </div>
          <h1 className="text-3xl font-bold text-primary animate-pulse">ConnectMe</h1>
        </div>
      ) : (
        <div className="w-full max-w-md animate-slide-up">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} className="mr-1" />
              Quay lại
            </button>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-2">
                CM
              </div>
              <span className="font-semibold text-lg">ConnectMe</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border rounded-xl shadow-lg p-8">
            <h1 className="text-2xl font-bold mb-2 text-center">Đăng nhập</h1>
            <p className="text-center text-muted-foreground mb-6">Đăng nhập để kết nối và tham gia cuộc họp</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder="Nhập mật khẩu của bạn"
                  required
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <LogIn size={18} className="mr-2" />
                      Đăng nhập
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-muted-foreground">
                Chưa có tài khoản?{" "}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ConnectMe. Mọi quyền được bảo lưu.
          </div>
        </div>
      )}
    </div>
  )
}

export default Login

// Thêm CSS này vào file CSS chung hoặc trong component (nếu dùng CSS-in-JS)
// @keyframes fade-in {
//   from { opacity: 0; }
//   to { opacity: 1; }
// }

// @keyframes slide-up {
//   from { opacity: 0; transform: translateY(20px); }
//   to { opacity: 1; transform: translateY(0); }
// }

// .animate-fade-in {
//   animation: fade-in 0.5s forwards;
// }

// .animate-slide-up {
//   animation: slide-up 0.5s forwards;
// }
