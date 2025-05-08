import React, { useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"
import { authService } from "../services/authService"

const ForgotPassword = () => 
{
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [otpFailed, setOtpFailed] = useState(false)
  const [serverOtp, setServerOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(300)
  const timerRef = useRef()

  useEffect(() => 
  {
    if (step === 2) 
    {
      setCountdown(300)
      timerRef.current = setInterval(() => 
      {
        setCountdown(prev => 
        {
            if (prev <= 1) 
            {
                clearInterval(timerRef.current);
                return 0
            }
            return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [step, serverOtp])

  const handleSendOtp = async (e) => 
  {
    e.preventDefault()
    setLoading(true)
    setError("")

    try 
    {
      const otpResponse = await authService.sendOtp(email)
      setServerOtp(otpResponse)
      setStep(2)
    } 
    catch (error) 
    {
      setError("Không gửi được OTP. Vui lòng thử lại.")
    }
    setLoading(false)
  }

  const handleVerifyOtp = (e) => 
  {
    e.preventDefault()
    setError("")
    if (otp.trim() === String(serverOtp).trim()) 
    {
      setLoading(true)
      setTimeout(() =>
      {
        setStep(3)
        setOtpFailed(false)
        setLoading(false)
      }, 1000)
    }
    else
    {
      setError("Mã OTP không đúng.")
      setOtpFailed(true)
      setCountdown(0)
      clearInterval(timerRef.current)
    }
  }

  const handleResetPassword = async (e) => 
  {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (newPassword.length < 8) 
    {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.")
      setLoading(false)
      return
    }

    try 
    {
      await authService.forgotPassword(email, newPassword)
      setStep(4)
    } 
    catch (error) 
    {
      setError("Không thể đặt lại mật khẩu. Vui lòng thử lại.")
    }
    setLoading(false)
  }

  const handleResendOtp = async () => 
  {
    setLoading(true)
    setError("")

    try 
    {
      const otpResponse = await authService.sendOtp(email)
      setServerOtp(otpResponse)
      setOtp("")
      setCountdown(300)
      setOtpFailed(false)
      setStep(2)
      clearInterval(timerRef.current)

      timerRef.current = setInterval(() =>
      {
        setCountdown(prev =>
        {
            if (prev <= 1)
            {
                clearInterval(timerRef.current);
                return 0
            }
            return prev - 1
        })
      }, 1000)
    } 
    catch (error) 
    {
      setError("Không gửi được OTP. Vui lòng thử lại.")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-8">
          <Link to="/login" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <span className="mr-2">&larr;</span> Đăng nhập
          </Link>
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-2 overflow-hidden">
              <img src={"/logo.png"} alt="ConnectMe Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold text-lg">ConnectMe</span>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border rounded-xl shadow-lg p-8">
          {
            step === 1 && 
            (
                <>
                  <h1 className="text-2xl font-bold mb-2 text-center">Quên mật khẩu</h1>
                  <p className="text-center text-muted-foreground mb-6">Nhập email để nhận mã OTP</p>
                  {
                    error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
                  }
                  <form onSubmit={handleSendOtp} className="space-y-5">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none mt-2"
                        placeholder="Nhập email của bạn"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      {
                        loading ? "Đang gửi..." : "Gửi OTP"
                      }
                    </button>
                  </form>
                </>
            )
          }
          {
            step === 2 && 
            (
                <>
                  <h1 className="text-2xl font-bold mb-2 text-center">Nhập mã OTP</h1>
                  <p className="text-center text-muted-foreground mb-6">Mã OTP đã gửi về email của bạn</p>
                  {
                    error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
                  }
                  <form onSubmit={handleVerifyOtp} className="space-y-5">
                    <div>
                      <label className="text-sm font-medium">Mã OTP</label>
                      <input
                        type="text"
                        required
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none mt-2"
                        placeholder="Nhập mã OTP"
                        disabled={otpFailed}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                      disabled={loading || otpFailed}
                    >
                      Xác nhận OTP
                    </button>
                  </form>
                  <div className="text-center mt-4">
                    <button
                      onClick={handleResendOtp}
                      disabled={countdown > 0 || loading}
                      className={`text-primary hover:underline font-medium ${countdown > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      Gửi lại OTP {countdown > 0 ? `(${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")})` : ""}
                    </button>
                  </div>
                </>
            )
          }
          {
            step === 3 && 
            (
                <>
                  <h1 className="text-2xl font-bold mb-2 text-center">Đặt lại mật khẩu</h1>
                  <p className="text-center text-muted-foreground mb-6">Nhập mật khẩu mới cho tài khoản</p>
                  {
                    error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
                  }
                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <div>
                      <label className="text-sm font-medium">Mật khẩu mới</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none mt-2"
                        placeholder="Nhập mật khẩu mới"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      Đặt lại mật khẩu
                    </button>
                  </form>
                </>
            )
          }
          {
            step === 4 && 
            (
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-2 text-green-600">Thành công!</h1>
                  <p className="mb-6">Mật khẩu đã được đặt lại. Bạn có thể đăng nhập bằng mật khẩu mới.</p>
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Quay lại đăng nhập
                  </Link>
                </div>
            )
          }
        </div>
        <div className="mt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} ConnectMe. Mọi quyền được bảo lưu.
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
