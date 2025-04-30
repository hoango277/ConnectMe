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

    try {
      const response = await meetingService.joinMeeting(meetingCode, displayName)
      if (response.success) {
        navigate(`/meeting/${response.meetingCode}`)
      } else {
        throw new Error("Failed to join meeting")
      }
    } catch (err) {
      console.error("Error joining meeting:", err)
      setError(err.response?.data?.message || "Failed to join meeting. Please check the meeting code and try again.")
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
          <h1 className="text-2xl font-bold">Join a Meeting</h1>
          <p className="text-muted-foreground mt-2">Enter a meeting code to join</p>
        </div>

        {error && <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">{error}</div>}

        <div className="bg-background border rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="meetingCode" className="text-sm font-medium">
                Meeting Code *
              </label>
              <input
                id="meetingCode"
                type="text"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                className="input"
                placeholder="Enter meeting code"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                Your Name (for guests)
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                placeholder="How you'll appear in the meeting"
              />
              <p className="text-xs text-muted-foreground">Leave empty to use your account name</p>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <Video size={18} />
                  Join Meeting
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default JoinMeeting
