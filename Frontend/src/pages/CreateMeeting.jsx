"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { meetingService } from "../services/meetingService"
import { Calendar, Video, ArrowLeft } from "lucide-react"
import { getCurrentUserId } from "../utils/auth"
import dayjs from "dayjs" // Import dayjs for timezone handling

const CreateMeeting = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    password: "",
    hostId: null,
    actualStart: "",
    invitedParticipants: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const userId = await getCurrentUserId()
      if (!userId) {
        navigate("/login")
        return
      }
      setFormData(prev => ({ ...prev, hostId: userId }))
    }
    fetchCurrentUser()
  }, [navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleParticipantsChange = (e) => {
    const { value } = e.target
    const participantsArray = value.split(",").map(p => p.trim())
    setFormData(prev => ({
      ...prev,
      invitedParticipants: participantsArray
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.hostId) return

    setIsLoading(true)
    setError(null)

    try {
      const meetingData = {
        ...formData,
        // Convert the actualStart from local time to ISO string (formatted correctly)
        actualStart: formData.actualStart
          ? dayjs(formData.actualStart).format("YYYY-MM-DDTHH:mm:ss") // Use dayjs to handle the conversion
          : null,
        invitedParticipants: formData.invitedParticipants
      }

      const response = await meetingService.createMeeting(meetingData)
      if (response.code === 200) {
        alert("Meeting created successfully");        
        navigate(`/`)
      } else {
        throw new Error(response.message || "Failed to create meeting")
      }
    } catch (err) {
      console.error("Error creating meeting:", err)
      setError(err.message || "Failed to create meeting. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartInstantMeeting = async () => {
    if (!formData.hostId) return

    setIsLoading(true)
    setError(null)

    try {
      const meetingData = {
        title: "Instant Meeting",
        description: "Instant meeting created on " + new Date().toLocaleString(),
        hostId: formData.hostId,
        actualStart: dayjs().format("YYYY-MM-DDTHH:mm:ss"), // Instant meeting time in correct format
        invitedParticipants: []
      }

      const response = await meetingService.createMeeting(meetingData)
      if (response.code === 200) {
        try {
          const resJoin = await meetingService.joinMeeting(response.result.meetingCode)
          if (resJoin.success) {
            navigate(`/meeting/${resJoin.meetingCode}`, { replace: true })
          } else {
            throw new Error(resJoin.message || "Failed to join meeting")
          }
        } catch (err) {
          let errorMessage = "Không thể tham gia cuộc họp. Vui lòng kiểm tra mã cuộc họp và thử lại."
          if (err.message) {
            errorMessage = err.message
          } else if (err.response?.data?.message) {
            errorMessage = err.response.data.message
          }
          setError(errorMessage)
        }
      } else {
        throw new Error(response.message || "Failed to create meeting")
      }
    } catch (err) {
      console.error("Error creating instant meeting:", err)
      setError(err.message || "Failed to create meeting. Please try again.")
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

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Create a Meeting</h1>
          <p className="text-muted-foreground">Schedule a new meeting or start one instantly</p>
        </div>
        <button
          onClick={handleStartInstantMeeting}
          className="mt-4 md:mt-0 btn btn-primary flex items-center gap-2"
          disabled={isLoading}
        >
          <Video size={18} />
          Start Instant Meeting
        </button>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">{error}</div>}

      <div className="bg-background border rounded-lg shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Meeting Title *</label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                className="input"
                placeholder="Weekly Team Meeting"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="actualStart" className="text-sm font-medium">Date and Time</label>
              <input
                id="actualStart"
                name="actualStart"
                type="datetime-local"
                value={formData.actualStart}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input min-h-[100px]"
              placeholder="Meeting agenda and details..."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Meeting Password (Optional)</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="input"
              placeholder="Enter meeting password"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="invitedParticipants" className="text-sm font-medium">Participants (separate emails by comma)</label>
            <input
              id="participants"
              name="participants"
              type="text"
              value={formData.invitedParticipants.join(",")}
              onChange={handleParticipantsChange}
              className="input"
              placeholder="email1@example.com, email2@example.com"
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={isLoading}>
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <Calendar size={18} />
                  Schedule Meeting
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateMeeting
