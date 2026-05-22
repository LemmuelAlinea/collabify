import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import { getProjectTypeLabel } from '../../../config/projectTypes'

function TeacherProjectDetailsPage() {
  const { projectId } = useParams()

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [startedGroups, setStartedGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchProjectDetails()
  }, [projectId])

  async function fetchAssigneeName(userId) {
    if (!userId) return 'Unassigned'

    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .maybeSingle()

    if (!data) return 'Unknown Student'

    return `${data.first_name || ''} ${data.last_name || ''}`.trim()
  }

  async function fetchProjectDetails() {
    if (!project) {
      setLoading(true)
    }

    setMessage('')

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError) {
      setMessage(projectError.message)
      setLoading(false)
      return
    }

    const { data: taskRows } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    const tasksWithNames = await Promise.all(
      (taskRows || []).map(async (task) => {
        const assigneeName = await fetchAssigneeName(task.assigned_to)

        return {
          ...task,
          assigneeName,
        }
      })
    )

    const { data: logs } = await supabase
      .from('project_activity_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    const { data: starts } = await supabase
      .from('project_starts')
      .select('*')
      .eq('project_id', projectId)
      .order('started_at', { ascending: false })

    const startsWithGroups = await Promise.all(
      (starts || []).map(async (start) => {
        const { data: group } = await supabase
          .from('groups')
          .select('group_name')
          .eq('id', start.group_id)
          .maybeSingle()

        return {
          ...start,
          group_name: group?.group_name || 'Unknown Group',
        }
      })
    )

    setProject(projectData)
    setTasks(tasksWithNames)
    setActivityLogs(logs || [])
    setStartedGroups(startsWithGroups)
    setLoading(false)
  }

  function formatDate(dateValue) {
    if (!dateValue) return 'No deadline'

    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) return 'Invalid date'

    return date.toLocaleDateString()
  }

  function formatDateTime(dateValue) {
    if (!dateValue) return 'N/A'

    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) return 'Invalid date'

    return date.toLocaleString()
  }

  const completedTasks = tasks.filter(
    (task) => task.status === 'submitted' || task.status === 'completed'
  )

  // eslint-disable-next-line no-unused-vars
  const inProgressTasks = tasks.filter(
    (task) => task.status === 'in_progress'
  )

  if (loading) {
    return (
      <DashboardLayout 
        title="Collabify"
        pageTitle="Project Details"
        navigation={teacherNavigation}
      >
        <p className="text-gray-500">Loading project details...</p>
      </DashboardLayout>
    )
  }

  if (!project) {
    return (
      <DashboardLayout
        title="Collabify"
        pageTitle="Project Details"
        navigation={teacherNavigation}
      >
        <p className="text-gray-500">Project not found.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Project Details"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              to={`/teacher/classes/${project.class_id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
            >
              <ChevronLeft size={18} />
              Back to Class
            </Link>
            <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
              {project.title}
            </h1>

            <p className="mt-2 max-w-3xl text-gray-500">
              {getProjectTypeLabel(project.project_type)} • {project.status}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-400 bg-white p-4 shadow-sm lg:min-w-[260px]">
            <p className="text-sm text-gray-500">Deadline</p>
            <p className="mt-1 text-2xl font-black text-gray-900">
              {formatDate(project.deadline)}
            </p>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card
            title="Status"
            value={project.status}
            description="Current project status"
          />

          <Card
            title="Started Groups"
            value={startedGroups.length}
            description="Groups that started"
          />

          <Card
            title="Tasks"
            value={tasks.length}
            description="Project tasks"
          />

          <Card
            title="Completed"
            value={`${completedTasks.length}/${tasks.length}`}
            description="Submitted or completed"
          />
        </div>

        <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-black">
              Description
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Project overview and instructions.
            </p>
          </div>

          <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
            {project.description || 'No description provided.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black text-black">
              Project Guidelines
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Instructions and requirements for students.
            </p>

            <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
              {project.guidelines_text || 'No guidelines provided.'}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black text-black">
              Grading Rubric
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Criteria used to evaluate submissions.
            </p>

            <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
              {project.rubric_text || 'No rubric provided.'}
            </p>
          </div>
        </div>

        

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-black">
                Groups That Started
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Groups that have already started this project.
              </p>
            </div>

            {startedGroups.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
                No group has started this project yet.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {startedGroups.map((item) => (
<div
  key={item.id}
  className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4"
>
  <p className="font-black text-gray-900">
    {item.group_name}
  </p>

  <p className="mt-1 text-sm text-gray-500">
    Started at {formatDateTime(item.started_at)}
  </p>

<Link
  to={`/teacher/projects/${item.project_id}/groups/${item.group_id}`}
  className="mt-4 inline-flex h-11 items-center justify-center rounded-xl border border-[#00CFC8]/40 bg-white px-5 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
>
  Open Group Details
</Link>
</div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-black">
                Project Activity
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Recent activity logs for this project.
              </p>
            </div>

            {activityLogs.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
                No project activity yet.
              </div>
            ) : (
              <div className="mt-5 max-h-[460px] space-y-3 overflow-y-auto pr-1">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4"
                  >
                    <p className="break-words font-semibold text-gray-900">
                      {log.description}
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      {formatDateTime(log.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default TeacherProjectDetailsPage