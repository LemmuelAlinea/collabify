import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import Card from '../../../components/ui/Card'
import { supabase } from '../../../lib/supabaseClient'

function TeacherDashboard() {
  const [teacherName, setTeacherName] = useState('Teacher')
  const [classes, setClasses] = useState([])
  const [projects, setProjects] = useState([])
  const [groups, setGroups] = useState([])
  const [reassignments, setReassignments] = useState([])
  const [activities, setActivities] = useState([])
  const [recentEvaluations, setRecentEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchDashboardData()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('teacher-live-activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_activity_logs',
        },
        () => {
          fetchDashboardData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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
      setTeacherName(
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
          'Teacher'
      )
    }

    const { data: classRows, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (classError) {
      setMessage(classError.message)
      setLoading(false)
      return
    }

    const classIds = (classRows || []).map((item) => item.id)

    const { data: projectRows } = await supabase
      .from('projects')
      .select('*')
      .eq('teacher_id', user.id)
      .order('deadline', { ascending: true })

    let groupRows = []

    if (classIds.length > 0) {
      const { data } = await supabase
        .from('groups')
        .select('*')
        .in('class_id', classIds)

      groupRows = data || []
    }

    const { data: reassignmentRows } = await supabase
      .from('task_reassignment_requests')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const { data: activityRows } = await supabase
      .from('project_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: evaluationRows } = await supabase
      .from('project_evaluations')
      .select(`
        id,
        project_id,
        group_id,
        status,
        finalized_at,
        created_at,
        ai_summary,
        projects (
          title,
          project_type,
          class_id
        ),
        groups (
          group_name
        )
      `)
      .eq('teacher_id', user.id)
      .order('finalized_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(5)

    setClasses(classRows || [])
    setProjects(projectRows || [])
    setGroups(groupRows || [])
    setReassignments(reassignmentRows || [])
    setActivities(activityRows || [])
    setRecentEvaluations(evaluationRows || [])
    setLoading(false)
  }

  function formatDateTime(dateValue) {
    if (!dateValue) return 'N/A'

    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) return 'Invalid date'

    return date.toLocaleString()
  }

  const activeProjects = projects.filter(
    (project) => project.status === 'active'
  )

  const completedProjects = projects.filter(
    (project) => project.status === 'completed'
  )

  const upcomingDeadlines = projects
    .filter((project) => project.deadline)
    .slice(0, 5)

  return (
    <DashboardLayout
      title="Teacher Panel"
      pageTitle="Dashboard"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Welcome, {teacherName}
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            Monitor your classes, projects, groups, evaluations, and
            reassignment requests.
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
              <Link
                to="/teacher/classes"
                className="block transition-all hover:-translate-y-1"
              >
                <Card
                  title="Total Classes"
                  value={classes.length}
                  description="Go to Classes"
                />
              </Link>

              <Link
                to="/teacher/classes"
                className="block transition-all hover:-translate-y-1"
              >
                <Card
                  title="Active Projects"
                  value={activeProjects.length}
                  description="View class projects"
                />
              </Link>

              <Link
                to="/teacher/classes"
                className="block transition-all hover:-translate-y-1"
              >
                <Card
                  title="Active Groups"
                  value={groups.length}
                  description="View class groups"
                />
              </Link>

              <Link
                to="/teacher/reassignments"
                className="block transition-all hover:-translate-y-1"
              >
                <Card
                  title="Pending Reassignments"
                  value={reassignments.length}
                  description="Needs review"
                />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm xl:col-span-2">
                <div>
                  <h2 className="text-2xl font-black text-black">
                    Recent Class Activity
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Latest activity across your handled classes.
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
                    Recently Evaluated Projects
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Open recently created or finalized evaluations.
                  </p>
                </div>

                {recentEvaluations.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
                    No evaluated projects yet.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {recentEvaluations.map((evaluation) => (
                      <Link
                        key={evaluation.id}
                        to={`/teacher/evaluation/projects/${evaluation.project_id}/groups/${evaluation.group_id}`}
                        className="block rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words font-black text-gray-900">
                              {evaluation.projects?.title || 'Untitled Project'}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {evaluation.groups?.group_name || 'Unknown Group'}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold capitalize text-[#00B8B0]">
                            {evaluation.status || 'draft'}
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-gray-500">
                          {evaluation.finalized_at
                            ? `Finalized: ${formatDateTime(
                                evaluation.finalized_at
                              )}`
                            : `Created: ${formatDateTime(
                                evaluation.created_at
                              )}`}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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
                    {upcomingDeadlines.map((project) => (
                      <Link
                        key={project.id}
                        to={`/teacher/projects/${project.id}`}
                        className="block rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <p className="break-words font-black text-gray-900">
                          {project.title}
                        </p>

                        <p className="mt-2 text-sm text-gray-500">
                          {formatDateTime(project.deadline)}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-black">
                    Project Progress Overview
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Quick summary of project statuses.
                  </p>
                </div>

                {projects.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
                    No project progress yet.
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-1 gap-3">
                    <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
                      <p className="text-sm text-gray-500">Active</p>
                      <p className="mt-1 text-2xl font-black text-gray-900">
                        {activeProjects.length}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                      <p className="text-sm text-gray-500">Completed</p>
                      <p className="mt-1 text-2xl font-black text-gray-900">
                        {completedProjects.length}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
                      <p className="text-sm text-gray-500">Total Projects</p>
                      <p className="mt-1 text-2xl font-black text-gray-900">
                        {projects.length}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-black">
                    Reassignment Requests
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Pending requests that need your review.
                  </p>
                </div>

                {reassignments.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
                    No reassignment requests.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {reassignments.slice(0, 5).map((item) => (
                      <Link
                        key={item.id}
                        to="/teacher/reassignments"
                        className="block rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <p className="font-black text-gray-900">
                          Pending request
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          {formatDateTime(item.created_at)}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default TeacherDashboard