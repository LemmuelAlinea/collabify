import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { studentNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'


function StudentTasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
const [searchParams] = useSearchParams()

const initialStatus =
  searchParams.get('status') === 'completed'
    ? 'completed'
    : searchParams.get('status') === 'in_progress'
      ? 'in_progress'
      : 'all'

const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [priorityFilter, setPriorityFilter] = useState('all')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchMyTasks()
  }, [])

  function formatDate(dateValue) {
    if (!dateValue) return 'No due date'

    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) {
      return 'Invalid date'
    }

    return date.toLocaleString()
  }

  async function fetchMyTasks() {
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

    const { data: taskRows, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const formattedTasks = await Promise.all(
      (taskRows || []).map(async (task) => {
        const { data: project } = await supabase
          .from('projects')
          .select('id, title, class_id, deadline')
          .eq('id', task.project_id)
          .maybeSingle()

        let classInfo = null

        if (project?.class_id) {
          const { data } = await supabase
            .from('classes')
            .select('class_name, section')
            .eq('id', project.class_id)
            .maybeSingle()

          classInfo = data
        }

        return {
          ...task,
          project,
          classInfo,
          displayDueDate: task.due_date || project?.deadline || null,
        }
      })
    )

    setTasks(formattedTasks)
    setLoading(false)
  }

  const pendingTasks = tasks.filter(
    (task) =>
      task.status === 'claimed' ||
      task.status === 'unclaimed' ||
      task.status === 'todo'
  )

const inProgressTasks = tasks.filter((task) =>
  ['todo', 'claimed', 'in_progress'].includes(task.status)
)

  const completedTasks = tasks.filter(
    (task) =>
      task.status === 'submitted' ||
      task.status === 'completed'
  )

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      String(task.title || '')
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(task.project?.title || '')
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(task.classInfo?.section || '')
        .toLowerCase()
        .includes(search.toLowerCase())

const matchesStatus =
  statusFilter === 'all'
    ? true
    : statusFilter === 'in_progress'
      ? ['todo', 'claimed', 'in_progress'].includes(task.status)
      : statusFilter === 'completed'
        ? ['submitted', 'completed'].includes(task.status)
        : String(task.status || '') === statusFilter

    const matchesPriority =
      priorityFilter === 'all'
        ? true
        : String(task.priority || '') === priorityFilter

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority
    )
  })

  function getStatusBadge(status) {
    const baseClass =
      'rounded-full border px-3 py-1 text-xs font-semibold capitalize'

    switch (status) {
      case 'completed':
      case 'submitted':
        return `${baseClass} border-green-300 bg-green-50 text-green-700`

      case 'in_progress':
        return `${baseClass} border-blue-300 bg-blue-50 text-blue-700`

      case 'revision_requested':
        return `${baseClass} border-orange-300 bg-orange-50 text-orange-700`

      default:
        return `${baseClass} border-[#00CFC8]/40 bg-white text-[#00B8B0]`
    }
  }

  function getPriorityBadge(priority) {
    const baseClass =
      'rounded-full border px-3 py-1 text-xs font-semibold capitalize'

    switch (priority) {
      case 'high':
        return `${baseClass} border-red-300 bg-red-50 text-red-700`

      case 'medium':
        return `${baseClass} border-yellow-300 bg-yellow-50 text-yellow-700`

      default:
        return `${baseClass} border-green-300 bg-green-50 text-green-700`
    }
  }

  return (
    <DashboardLayout
      title="Student Panel"
      pageTitle="Tasks"
      navigation={studentNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
              Tasks
            </h1>

            <p className="mt-2 max-w-3xl text-gray-500">
              View and manage your assigned tasks across all classes and
              projects.
            </p>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Card
            title="Pending"
            value={pendingTasks.length}
            description="Waiting tasks"
          />

          <Card
            title="In Progress"
            value={inProgressTasks.length}
            description="Currently working"
          />

          <Card
            title="Completed"
            value={completedTasks.length}
            description="Submitted tasks"
          />
        </div>

        <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-black">
                My Assigned Tasks
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Tasks assigned to you from every class and project.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search task..."
                className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#00CFC8]"
              >
                <option value="all">All Status</option>
                <option value="todo">Todo</option>
                <option value="claimed">Claimed</option>
                <option value="unclaimed">Unclaimed</option>
                <option value="in_progress">
                  In Progress
                </option>
                <option value="submitted">Submitted</option>
                <option value="completed">Completed</option>
                <option value="revision_requested">
                  Revision Requested
                </option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(e.target.value)
                }
                className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#00CFC8]"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="mt-5 text-gray-500">
              Loading tasks...
            </p>
          ) : filteredTasks.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
              No matching tasks found.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={getStatusBadge(task.status)}>
                          {String(task.status || '').replaceAll(
                            '_',
                            ' '
                          )}
                        </span>

                        <span
                          className={getPriorityBadge(
                            task.priority
                          )}
                        >
                          {task.priority || 'medium'}
                        </span>
                      </div>

                      <h3 className="mt-3 break-words text-2xl font-black text-gray-900">
                        {task.title}
                      </h3>

                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">
                        {task.description ||
                          'No description provided.'}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-gray-400 bg-[#F8FBFF] p-4 xl:min-w-[260px]">
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-gray-500">
                            Due Date
                          </p>

                          <p className="mt-1 font-bold text-gray-900">
                            {formatDate(task.displayDueDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">
                            Class
                          </p>

                          <p className="mt-1 font-bold text-gray-900">
                            {task.classInfo?.section ||
                              'N/A'}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">
                            Project
                          </p>

                          <p className="mt-1 break-words font-bold text-gray-900">
                            {task.project?.title || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {task.project?.id && (
                      <Link
                        to={`/student/projects/${task.project.id}`}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 text-sm font-black text-black transition-all hover:opacity-90"
                      >
                        Open Project
                      </Link>
                    )}

                    <Link
                      to={`/student/tasks/${task.id}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-[#00CFC8]/40 bg-white px-5 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                    >
                      Open Task
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default StudentTasksPage