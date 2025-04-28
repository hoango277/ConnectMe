"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { meetingService } from "../services/meetingService"
import { Calendar, Video, ArrowLeft } from "lucide-react"

const CreateMeeting = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledTime: "",
    duration: 30,
    isRecurring: false,
    recurringPattern: "weekly",
    participantEmails: "",
    enableWaitingRoom: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Format participant emails as an array
      const participantEmails = formData.participantEmails
        ? formData.participantEmails.split(",").map((email) => email.trim())
        : []

      const meetingData = {
        ...formData,
        participantEmails,
      }

      const response = await meetingService.createMeeting(meetingData)
      navigate(`/meeting/${response.id}`)
    } catch (err) {
      console.error("Error creating meeting:", err)
      setError(err.response?.data?.message || "Failed to create meeting. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartInstantMeeting = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const meetingData = {
        title: "Instant Meeting",
        description: "Instant meeting created on " + new Date().toLocaleString(),
        scheduledTime: new Date().toISOString(),
        duration: 60,
        isRecurring: false,
        enableWaitingRoom: false,
      }

      const response = await meetingService.createMeeting(meetingData)
      navigate(`/meeting/${response.id}`)
    } catch (err) {
      console.error("Error creating instant meeting:", err)
      setError(err.response?.data?.message || "Failed to create meeting. Please try again.")
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
              <label htmlFor="title" className="text-sm font-medium">
                Meeting Title *
              </label>
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
              <label htmlFor="scheduledTime" className="text-sm font-medium">
                Date and Time *
              </label>
              <input
                id="scheduledTime"
                name="scheduledTime"
                type="datetime-local"
                value={formData.scheduledTime}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input min-h-[100px]"
              placeholder="Meeting agenda and details..."
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="duration" className="text-sm font-medium">
                Duration (minutes) *
              </label>
              <select
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="participantEmails" className="text-sm font-medium">
                Participants (comma separated emails)
              </label>
              <input
                id="participantEmails"
                name="participantEmails"
                type="text"
                value={formData.participantEmails}
                onChange={handleChange}
                className="input"
                placeholder="john@example.com, jane@example.com"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="isRecurring"
              name="isRecurring"
              type="checkbox"
              checked={formData.isRecurring}
              onChange={handleChange}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="isRecurring" className="text-sm font-medium">
              Recurring meeting
            </label>
          </div>

          {formData.isRecurring && (
            <div className="space-y-2">
              <label htmlFor="recurringPattern" className="text-sm font-medium">
                Recurring Pattern
              </label>
              <select
                id="recurringPattern"
                name="recurringPattern"
                value={formData.recurringPattern}
                onChange={handleChange}
                className="input"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              id="enableWaitingRoom"
              name="enableWaitingRoom"
              type="checkbox"
              checked={formData.enableWaitingRoom}
              onChange={handleChange}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="enableWaitingRoom" className="text-sm font-medium">
              Enable waiting room
            </label>
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
