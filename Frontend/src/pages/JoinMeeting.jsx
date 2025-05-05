"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { meetingService } from "../services/meetingService"
import { ArrowLeft, Video } from "lucide-react"

const JoinMeeting = () => {
  const navigate = useNavigate()
  const [meetingCode, setMeetingCode] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!meetingCode.trim()) {
      setError("Vui lòng nhập mã cuộc họp")
      setIsLoading(false)
      return
    }

    try {
      console.log("Attempting to join meeting with code:", meetingCode);
      const response = await meetingService.joinMeeting(meetingCode, displayName)
      
      if (response.success) {
        console.log("Successfully joined meeting, navigating to meeting room");
        // Use replace instead of push to avoid adding to history stack
        // This helps prevent back button issues with WebRTC connections
        navigate(`/meeting/${response.meetingCode}`, { replace: true });
      } else {
        console.error("Join response unsuccessful:", response);
        throw new Error(response.message || "Failed to join meeting")
      }
    } catch (err) {
      console.error("Error joining meeting:", err)
      
      // Extract detailed error message
      let errorMessage = "Không thể tham gia cuộc họp. Vui lòng kiểm tra mã cuộc họp và thử lại.";
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false)
    }
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

      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Tham gia cuộc họp</h1>
          <p className="text-muted-foreground mt-2">Nhập mã cuộc họp để tham gia</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="meetingCode" className="block text-sm font-medium mb-1">
              Mã cuộc họp
            </label>
            <input
              type="text"
              id="meetingCode"
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
              placeholder="Nhập mã cuộc họp"
              className="w-full p-2 border border-gray-300 rounded"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
            ) : (
              <>
                <Video size={16} className="mr-2" />
                Tham gia
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default JoinMeeting
