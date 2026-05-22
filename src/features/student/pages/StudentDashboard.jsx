import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { studentNavigation } from '../../../config/navigation'
import Card from '../../../components/ui/Card'
import { supabase } from '../../../lib/supabaseClient'

function StudentDashboard() {
  const [studentName, setStudentName] = useState('Student')
  const [classes, setClasses] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [myGroupIds, setMyGroupIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (myGroupIds.length === 0) return

    const channel = supabase
      .channel('student-live-activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_activity_logs',
        },
        (payload) => {
          if (!payload.new.group_id) return
          if (!myGroupIds.includes(payload.new.group_id)) return

          setActivities((current) => {
            const alreadyExists = current.some(
              (activity) => activity.id === payload.new.id
            )

            if (alreadyExists) return current

            return [payload.new, ...current].slice(0, 5)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [myGroupIds])

  async function fetchDashboardData() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('User not found.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      setStudentName(
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
          'Student'
      )
    }

    const { data: memberships, error: membershipError } = await supabase
      .from('class_members')
      .select(`
        id,
        classes (
          id,
          class_name,
          section
        )
      `)
      .eq('student_id', user.id)

    if (membershipError) {
      setMessage(membershipError.message)
      setLoading(false)
      return
    }

    const joinedClasses = (memberships || [])
      .map((membership) => membership.classes)
      .filter(Boolean)

    const classIds = joinedClasses.map((item) => item.id)

    let projectRows = []

    if (classIds.length > 0) {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .in('class_id', classIds)
        .order('deadline', { ascending: true })

      projectRows = data || []
    }

    const { data: taskRows } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false })

    const { data: groupMemberRows } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('student_id', user.id)

    const groupIds = (groupMemberRows || []).map((item) => item.group_id)

    let activityRows = []

    if (groupIds.length > 0) {
      const { data } = await supabase
        .from('project_activity_logs')
        .select('*')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(5)

      activityRows = data || []
    }

    setClasses(joinedClasses)
    setProjects(projectRows)
    setTasks(taskRows || [])
    setActivities(activityRows)
    setMyGroupIds(groupIds)
    setLoading(false)
  }

  function formatDateTime(dateValue) {
    if (!dateValue) return 'N/A'

    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) return 'Invalid date'

    return date.toLocaleString()
  }

  function getDateKey(dateValue) {
    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) return ''

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function getCalendarDays() {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()

    const firstDay = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()

    return {
      year,
      month,
      firstDay,
      totalDays,
      todayDate: today.getDate(),
      todayKey: getDateKey(today),
      monthLabel: today.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      }),
    }
  }

  const activeProjects = projects.filter(
    (project) => project.status === 'active'
  )

  const pendingTasks = tasks.filter(
    (task) =>
      task.status === 'claimed' ||
      task.status === 'in_progress' ||
      task.status === 'todo'
  )

  const completedTasks = tasks.filter(
    (task) => task.status === 'submitted' || task.status === 'completed'
  )

const calendarTasks = tasks.filter(
  (task) =>
    task.due_date &&
    task.status !== 'submitted' &&
    task.status !== 'completed'
)

const upcomingDeadlines = calendarTasks
  .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
  .slice(0, 5)

const calendar = getCalendarDays()

const deadlineMap = calendarTasks.reduce((map, task) => {
  const key = getDateKey(task.due_date)

  if (!map[key]) {
    map[key] = []
  }

  map[key].push(task)

  return map
}, {})

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Dashboard"
      navigation={studentNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Welcome, {studentName}
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            Here is your project collaboration overview.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading dashboard...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Link to="/student/classes" className="block transition-all hover:-translate-y-1">
                <Card
                  title="Active Classes"
                  value={classes.length}
                  description="Joined classes"
                />
              </Link>

              <Link to="/student/classes" className="block transition-all hover:-translate-y-1">
                <Card
                  title="Active Projects"
                  value={activeProjects.length}
                  description="Ongoing projects"
                />
              </Link>

              <Link
                to="/student/tasks?status=in_progress"
                className="block transition-all hover:-translate-y-1"
              >
                <Card
                  title="Pending Tasks"
                  value={pendingTasks.length}
                  description="Tasks to finish"
                />
              </Link>

              <Link
                to="/student/tasks?status=completed"
                className="block transition-all hover:-translate-y-1"
              >
                <Card
                  title="Completed Tasks"
                  value={completedTasks.length}
                  description="Submitted tasks"
                />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm xl:col-span-2">
                <div>
                  <h2 className="text-2xl font-black text-black">
                    Recent Project Activity
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Latest activities from your own groups.
                  </p>
                </div>

                {activities.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
                    No recent activity yet.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4"
                      >
                        <p className="break-words text-sm font-semibold text-gray-900">
                          {activity.description}
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          {formatDateTime(activity.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-black">
                    Calendar
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    {calendar.monthLabel}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-7 gap-1 text-center text-sm">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                    (day) => (
                      <div
                        key={day}
                        className="py-2 text-xs font-black text-gray-500"
                      >
                        {day}
                      </div>
                    )
                  )}

                  {Array.from({ length: calendar.firstDay }).map((_, index) => (
                    <div key={`empty-${index}`} className="py-2" />
                  ))}

                  {Array.from({ length: calendar.totalDays }).map((_, index) => {
                    const day = index + 1
                    const dateKey = getDateKey(
                      new Date(calendar.year, calendar.month, day)
                    )
                    const isToday = dateKey === calendar.todayKey
                    const hasDeadline = Boolean(deadlineMap[dateKey]?.length)

                    return (
                      <div
                        key={day}
title={
  hasDeadline
    ? deadlineMap[dateKey]
        .map((task) => task.title)
        .join(', ')
    : ''
}
                        className={`relative rounded-xl py-2 text-sm font-semibold transition-all ${
                          isToday
                            ? 'bg-gradient-to-r from-cyan-400 to-green-400 text-black'
                            : hasDeadline
                              ? 'bg-red-50 text-red-700 hover:bg-red-100'
                              : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {hasDeadline && (
                          <span className="absolute left-1/2 top-0 -translate-x-1/2 text-xs font-black text-red-600">
                            !
                          </span>
                        )}

                        <span className={hasDeadline ? 'pt-1 block' : ''}>
                          {day}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-black">
                    Upcoming Deadlines
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Projects with the nearest due dates.
                  </p>
                </div>

                {upcomingDeadlines.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
                    No upcoming deadlines.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
{upcomingDeadlines.map((task) => (
  <div
    key={task.id}
    className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4"
  >
    <p className="break-words font-black text-gray-900">
      {task.title}
    </p>

    <p className="mt-2 text-sm text-gray-500">
      {formatDateTime(task.due_date)}
    </p>
  </div>
))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-black">
                    Group Announcements
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Announcements from your class groups will appear here.
                  </p>
                </div>

                <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
                  No announcements yet.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default StudentDashboard