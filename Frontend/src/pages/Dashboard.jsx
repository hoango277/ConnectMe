"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { meetingService } from "../services/meetingService"
import { Calendar, Clock, Plus, Video, Users } from "lucide-react"

const Dashboard = () => {
  const { currentUser } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const data = await meetingService.getUserMeetings()
        setMeetings(data)
      } catch (err) {
        console.error("Error fetching meetings:", err)
        setError("Failed to load your meetings. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchMeetings()
  }, [])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getUpcomingMeetings = () => {
    const now = new Date()
    return meetings.filter((meeting) => new Date(meeting.scheduledTime) > now && meeting.status !== "ended")
  }

  const getPastMeetings = () => {
    const now = new Date()
    return meetings.filter((meeting) => new Date(meeting.scheduledTime) < now || meeting.status === "ended")
  }

  const upcomingMeetings = getUpcomingMeetings()
  const pastMeetings = getPastMeetings()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {currentUser?.name}</h1>
          <p className="text-muted-foreground">Manage your meetings and conferences</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <Link to="/join" className="btn btn-outline flex items-center gap-2">
            <Video size={18} />
            Join Meeting
          </Link>
          <Link to="/create" className="btn btn-primary flex items-center gap-2">
            <Plus size={18} />
            New Meeting
          </Link>
        </div>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">{error}</div>}

      <div className="grid gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Upcoming Meetings</h2>
          {upcomingMeetings.length === 0 ? (
            <div className="bg-muted p-6 rounded-lg text-center">
              <p className="text-muted-foreground">You don't have any upcoming meetings.</p>
              <Link to="/create" className="text-primary hover:underline mt-2 inline-block">
                Schedule a new meeting
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="bg-background border rounded-lg shadow-sm overflow-hidden">
                  <div className="p-5">
                    <h3 className="font-semibold text-lg mb-2">{meeting.title}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar size={16} className="mr-2" />
                        {formatDate(meeting.scheduledTime)}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock size={16} className="mr-2" />
                        {meeting.duration} minutes
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Users size={16} className="mr-2" />
                        {meeting.participantCount || 0} participants
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted p-3 flex justify-between">
                    <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Meeting ID: {meeting.meetingCode}
                    </div>
                    <Link to={`/meeting/${meeting.id}`} className="text-primary hover:underline text-sm font-medium">
                      Join
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Past Meetings</h2>
          {pastMeetings.length === 0 ? (
            <div className="bg-muted p-6 rounded-lg text-center">
              <p className="text-muted-foreground">You don't have any past meetings.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted border-b">
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Duration</th>
                    <th className="text-left p-3">Participants</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastMeetings.map((meeting) => (
                    <tr key={meeting.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{meeting.title}</td>
                      <td className="p-3">{formatDate(meeting.scheduledTime)}</td>
                      <td className="p-3">{meeting.duration} minutes</td>
                      <td className="p-3">{meeting.participantCount || 0}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-muted-foreground/20 text-muted-foreground">
                          {meeting.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
