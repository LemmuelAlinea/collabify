import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalManagerNavigation } from '../config/generalNavigation'

function GeneralManagerAnalyticsPage() {
  const [projectProgress, setProjectProgress] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
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

    const { data, error } = await supabase.rpc(
      'get_general_manager_project_progress',
      {
        manager_uuid: user.id,
      }
    )

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const projects = data || []

    setProjectProgress(projects)

    if (projects.length > 0) {
      setSelectedProjectId(projects[0].project_id)
    }

    setLoading(false)
  }

  const selectedProject = projectProgress.find(
    (project) => project.project_id === selectedProjectId
  )

  const taskCount = Number(selectedProject?.task_count || 0)
  const completedTaskCount = Number(selectedProject?.completed_task_count || 0)
  const pendingTaskCount = Math.max(taskCount - completedTaskCount, 0)
  const memberCount = Number(selectedProject?.member_count || 0)

  const completionRate =
    taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0

  return (
    <DashboardLayout
      title="General Workplace"
      pageTitle="Analytics"
      navigation={generalManagerNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Project Analytics
          </h1>

          <p className="mt-2 text-gray-500">
            Choose a project to view separate analytics instead of combining all
            projects together.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading analytics...</p>
        ) : projectProgress.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            No project analytics available yet.
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Select Project"
                description="Analytics below will update based on the selected project."
              />

              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 outline-none focus:border-[#00CFC8]"
              >
                {projectProgress.map((project) => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <Card
                title="Project Status"
                value={selectedProject?.status || 'N/A'}
                description="Current project state"
              />

              <Card
                title="Members"
                value={memberCount}
                description="Assigned members"
              />

              <Card
                title="Total Tasks"
                value={taskCount}
                description="Tasks in this project"
              />

              <Card
                title="Completion Rate"
                value={`${completionRate}%`}
                description="Completed project tasks"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Task Status"
                  description="Task completion summary for this project."
                />

                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-gray-400">Completed Tasks</p>
                    <p className="mt-1 text-3xl font-black text-gray-900">
                      {completedTaskCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-gray-400">Pending Tasks</p>
                    <p className="mt-1 text-3xl font-black text-gray-900">
                      {pendingTaskCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-gray-400">Total Tasks</p>
                    <p className="mt-1 text-3xl font-black text-gray-900">
                      {taskCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Project Progress"
                  description="Visual progress for the selected project."
                />

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="mb-3 flex justify-between text-sm">
                    <span className="font-semibold text-gray-900">
                      {selectedProject?.title}
                    </span>

                    <span className="font-black text-[#00B8B0]">
                      {completionRate}%
                    </span>
                  </div>

                  <div className="h-4 overflow-hidden rounded-full bg-gray-300">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>

                  <p className="mt-4 text-sm text-gray-600">
                    {completedTaskCount} out of {taskCount} task(s) completed.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Quick Insight"
                  description="Simple interpretation for this project."
                />

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="leading-relaxed text-gray-600">
                    <span className="font-black text-[#00CFC8]">
                      {selectedProject?.title}
                    </span>{' '}
                    currently has a completion rate of{' '}
                    <span className="font-black text-[#00CFC8]">
                      {completionRate}%
                    </span>
                    , with{' '}
                    <span className="font-black text-[#00CFC8]">
                      {memberCount}
                    </span>{' '}
                    member(s),{' '}
                    <span className="font-black text-[#00CFC8]">
                      {completedTaskCount}
                    </span>{' '}
                    completed task(s), and{' '}
                    <span className="font-black text-[#00CFC8]">
                      {pendingTaskCount}
                    </span>{' '}
                    pending task(s).
                  </p>

                  <Link
                    to={`/general/manager/projects/${selectedProject?.project_id}`}
                    className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:scale-105 hover:shadow-lg"
                  >
                    Open Project
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="All Project Progress"
                description="Use this table to compare projects, then select one above for detailed analytics."
              />

              <div className="overflow-hidden rounded-3xl border border-gray-300">
                <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-100">
                      <tr>
                        <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                          Project
                        </th>
                        <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                          Status
                        </th>
                        <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                          Priority
                        </th>
                        <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                          Members
                        </th>
                        <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                          Tasks
                        </th>
                        <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                          Progress
                        </th>
                        <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                          Deadline
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {projectProgress.map((project) => {
                        const projectTaskCount = Number(project.task_count || 0)
                        const projectCompletedCount = Number(
                          project.completed_task_count || 0
                        )

                        const projectRate =
                          projectTaskCount > 0
                            ? Math.round(
                                (projectCompletedCount / projectTaskCount) * 100
                              )
                            : 0

                        return (
                          <tr
                            key={project.project_id}
                            className={`cursor-pointer hover:bg-gray-50 ${
                              selectedProjectId === project.project_id
                                ? 'bg-cyan-50'
                                : ''
                            }`}
                            onClick={() =>
                              setSelectedProjectId(project.project_id)
                            }
                          >
                            <td className="border-b border-gray-200 p-4 font-semibold text-gray-900">
                              <Link
                                to={`/general/manager/projects/${project.project_id}`}
                                className="font-semibold text-[#00CFC8] hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {project.title}
                              </Link>
                            </td>

                            <td className="border-b border-gray-200 p-4 text-gray-700">
                              {project.status}
                            </td>

                            <td className="border-b border-gray-200 p-4 text-gray-700">
                              {project.priority}
                            </td>

                            <td className="border-b border-gray-200 p-4 text-gray-700">
                              {project.member_count}
                            </td>

                            <td className="border-b border-gray-200 p-4 text-gray-700">
                              {projectCompletedCount}/{projectTaskCount}
                            </td>

                            <td className="border-b border-gray-200 p-4 text-gray-700">
                              <div className="flex items-center gap-3">
                                <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-400">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400"
                                    style={{ width: `${projectRate}%` }}
                                  />
                                </div>

                                <span>{projectRate}%</span>
                              </div>
                            </td>

                            <td className="border-b border-gray-200 p-4 text-gray-700">
                              {project.deadline
                                ? new Date(project.deadline).toLocaleDateString()
                                : 'None'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default GeneralManagerAnalyticsPage