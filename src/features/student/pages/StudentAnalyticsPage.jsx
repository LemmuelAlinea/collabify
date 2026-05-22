import { useEffect, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { studentNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import { getProjectTypeLabel } from '../../../config/projectTypes'

function StudentAnalyticsPage() {
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [taskBreakdown, setTaskBreakdown] = useState([])
  const [recentUploads, setRecentUploads] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [taskSearch, setTaskSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      // eslint-disable-next-line react-hooks/immutability
      fetchAnalytics(selectedProjectId)
    }
  }, [selectedProjectId])

  async function fetchProjects() {
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

    const { data: assignedTasks, error } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('assigned_to', user.id)

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const projectIds = [
      ...new Set((assignedTasks || []).map((task) => task.project_id)),
    ].filter(Boolean)

    if (projectIds.length === 0) {
      setProjects([])
      setLoading(false)
      return
    }

    const { data: projectRows, error: projectError } = await supabase
      .from('projects')
      .select('id, title, project_type, deadline, class_id')
      .in('id', projectIds)
      .order('deadline', { ascending: true })

    if (projectError) {
      setMessage(projectError.message)
      setLoading(false)
      return
    }

    setProjects(projectRows || [])
    setSelectedProjectId(projectRows?.[0]?.id || '')
    setLoading(false)
  }

  async function fetchAnalytics(projectId) {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.rpc(
      'get_student_project_analytics',
      {
        project_uuid: projectId,
      }
    )

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const stats = data?.[0] || {
      assigned_tasks_count: 0,
      submitted_tasks_count: 0,
      in_progress_tasks_count: 0,
      pending_tasks_count: 0,
      total_uploads_count: 0,
      contribution_score: 0,
    }

    setAnalytics(stats)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data: tasks } = await supabase
      .from('tasks')
      .select(
        'id, title, status, priority, difficulty, category, created_at'
      )
      .eq('assigned_to', user.id)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    setTaskBreakdown(tasks || [])

    const taskIds = (tasks || []).map((task) => task.id)

    if (taskIds.length === 0) {
      setRecentUploads([])
      setLoading(false)
      return
    }

    const { data: uploads } = await supabase
      .from('task_versions')
      .select('id, file_name, version_number, created_at, task_id')
      .eq('uploaded_by', user.id)
      .in('task_id', taskIds)
      .order('created_at', { ascending: false })
      .limit(5)

    setRecentUploads(uploads || [])
    setLoading(false)
  }

  const completedPercentage =
    analytics?.assigned_tasks_count > 0
      ? Math.round(
          (analytics.submitted_tasks_count /
            analytics.assigned_tasks_count) *
            100
        )
      : 0

  const filteredTasks = taskBreakdown.filter((task) => {
    const matchesSearch = String(task.title || '')
      .toLowerCase()
      .includes(taskSearch.toLowerCase())

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : String(task.status || '') === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <DashboardLayout
      title="Student Panel"
      pageTitle="Analytics"
      navigation={studentNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
              Analytics
            </h1>

            <p className="mt-2 max-w-3xl text-gray-500">
              View your contribution, uploads, and task performance per project.
            </p>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-black">
              Select Project
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Analytics are calculated only for the selected project.
            </p>
          </div>

          {projects.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
              No assigned project tasks yet.
            </div>
          ) : (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="mt-5 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title} •{' '}
                  {getProjectTypeLabel(project.project_type)}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading analytics...</p>
        ) : analytics && selectedProjectId ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card
                title="Contribution"
                value={`${analytics.contribution_score}%`}
                description="Project contribution"
              />

              <Card
                title="Completed"
                value={analytics.submitted_tasks_count}
                description={`${completedPercentage}% completion`}
              />

              <Card
                title="Uploads"
                value={analytics.total_uploads_count}
                description="Uploaded versions"
              />

              <Card
                title="Assigned"
                value={analytics.assigned_tasks_count}
                description="Assigned tasks"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-black">
                    Task Completion Overview
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Summary for the selected project.
                  </p>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-700">
                    <span>Project Progress</span>

                    <span>
                      {analytics.submitted_tasks_count}/
                      {analytics.assigned_tasks_count}
                    </span>
                  </div>

                  <div className="h-4 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400 transition-all"
                      style={{
                        width: `${completedPercentage}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-sm font-semibold text-[#00B8B0]">
                    {completedPercentage}% completed
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                    <p className="text-sm text-gray-500">Pending</p>

                    <h3 className="mt-2 text-2xl font-black text-gray-900">
                      {analytics.pending_tasks_count}
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                    <p className="text-sm text-gray-500">In Progress</p>

                    <h3 className="mt-2 text-2xl font-black text-gray-900">
                      {analytics.in_progress_tasks_count}
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                    <p className="text-sm text-gray-500">Submitted</p>

                    <h3 className="mt-2 text-2xl font-black text-gray-900">
                      {analytics.submitted_tasks_count}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-black">
                    Recent Uploads
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Latest uploaded task versions.
                  </p>
                </div>

                {recentUploads.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
                    No uploads yet for this project.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {recentUploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-gray-900">
                              V{upload.version_number} —{' '}
                              {upload.file_name}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {new Date(
                                upload.created_at
                              ).toLocaleString()}
                            </p>
                          </div>

                          <span className="w-fit rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0]">
                            Upload
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-black">
                    Task Breakdown
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Your tasks for the selected project.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
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
                    <option value="in_progress">
                      In Progress
                    </option>
                    <option value="completed">Completed</option>
                    <option value="revision_requested">
                      Revision Requested
                    </option>
                  </select>
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
                  No matching tasks found.
                </div>
              ) : (
                <div className="mt-5 overflow-hidden rounded-3xl border border-gray-400">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                            Task
                          </th>

                          <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                            Status
                          </th>

                          <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                            Category
                          </th>

                          <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                            Difficulty
                          </th>

                          <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                            Priority
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredTasks.map((task) => (
                          <tr
                            key={task.id}
                            className="transition-all hover:bg-gray-50"
                          >
                            <td className="border-b border-gray-400 p-4 font-semibold text-gray-900">
                              {task.title}
                            </td>

                            <td className="border-b border-gray-400 p-4">
                              <span className="rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold capitalize text-[#00B8B0]">
                                {String(task.status || '')
                                  .replaceAll('_', ' ')}
                              </span>
                            </td>

                            <td className="border-b border-gray-400 p-4 text-gray-700">
                              {task.category || 'general'}
                            </td>

                            <td className="border-b border-gray-400 p-4 text-gray-700 capitalize">
                              {task.difficulty || 'medium'}
                            </td>

                            <td className="border-b border-gray-400 p-4 text-gray-700 capitalize">
                              {task.priority || 'medium'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  )
}

export default StudentAnalyticsPage