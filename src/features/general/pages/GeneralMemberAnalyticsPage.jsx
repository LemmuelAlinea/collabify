import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalMemberNavigation } from '../config/generalNavigation'

function GeneralMemberAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [projectSummary, setProjectSummary] = useState([])
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

    const { data: analyticsRows, error: analyticsError } =
      await supabase.rpc('get_general_member_analytics', {
        member_uuid: user.id,
      })

    if (analyticsError) {
      setMessage(analyticsError.message)
      setLoading(false)
      return
    }

    const { data: summaryRows, error: summaryError } =
      await supabase.rpc('get_general_member_project_task_summary', {
        member_uuid: user.id,
      })

    if (summaryError) {
      setMessage(summaryError.message)
      setLoading(false)
      return
    }

    setAnalytics(analyticsRows?.[0] || null)
    setProjectSummary(summaryRows || [])
    setLoading(false)
  }

  const totalTasks = Number(analytics?.total_tasks || 0)
  const completedTasks = Number(analytics?.completed_tasks || 0)

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Analytics"
      navigation={generalMemberNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            My Analytics
          </h1>

          <p className="mt-2 text-gray-500">
            Track your task progress and contribution across general workplace
            projects.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading analytics...</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
              <Card
                title="Total Tasks"
                value={analytics?.total_tasks || 0}
                description="Assigned to you"
              />

              <Card
                title="To Do"
                value={analytics?.todo_tasks || 0}
                description="Not yet started"
              />

              <Card
                title="In Progress"
                value={analytics?.in_progress_tasks || 0}
                description="Currently working"
              />

              <Card
                title="Completed"
                value={analytics?.completed_tasks || 0}
                description="Finished tasks"
              />

              <Card
                title="Completion Rate"
                value={`${completionRate}%`}
                description="Your task completion"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
                <SectionHeader
                  title="Task Status"
                  description="Your task distribution."
                />

                <div className="space-y-4">
                  {[
                    {
                      label: 'To Do',
                      value: Number(analytics?.todo_tasks || 0),
                    },
                    {
                      label: 'In Progress',
                      value: Number(analytics?.in_progress_tasks || 0),
                    },
                    {
                      label: 'Completed',
                      value: Number(analytics?.completed_tasks || 0),
                    },
                  ].map((item) => {
                    const percent =
                      totalTasks > 0
                        ? Math.round((item.value / totalTasks) * 100)
                        : 0

                    return (
                      <div key={item.label}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="font-semibold text-gray-900">
                            {item.label}
                          </span>

                          <span className="text-gray-500">
                            {item.value} task(s)
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm xl:col-span-2">
                <SectionHeader
                  title="Performance Insight"
                  description="Simple overview of your current contribution."
                />

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="leading-relaxed text-gray-600">
                    You are currently assigned to{' '}
                    <span className="font-black text-[#00CFC8]">
                      {analytics?.total_projects || 0}
                    </span>{' '}
                    project(s), with{' '}
                    <span className="font-black text-[#00CFC8]">
                      {analytics?.total_tasks || 0}
                    </span>{' '}
                    total task(s). Your completion rate is{' '}
                    <span className="font-black text-[#00CFC8]">
                      {completionRate}%
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Project Task Summary"
                description="Task progress grouped by project."
              />

              {projectSummary.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                  No analytics available yet.
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-gray-300">
                  <div className="max-h-[480px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-gray-100">
                        <tr>
                          <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                            Project
                          </th>
                          <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                            Status
                          </th>
                          <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                            Tasks
                          </th>
                          <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                            To Do
                          </th>
                          <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                            In Progress
                          </th>
                          <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                            Completed
                          </th>
                          <th className="border-b border-gray-200 p-4 text-left text-gray-700">
                            Progress
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {projectSummary.map((project) => {
                          const taskCount = Number(project.task_count || 0)
                          const completedCount = Number(
                            project.completed_count || 0
                          )

                          const progress =
                            taskCount > 0
                              ? Math.round(
                                  (completedCount / taskCount) * 100
                                )
                              : 0

                          return (
                            <tr
                              key={project.project_id}
                              className="hover:bg-gray-50"
                            >
                              <td className="border-b border-gray-200 p-4 font-semibold text-gray-900">
                                <Link
                                  to={`/general/member/projects/${project.project_id}`}
                                  className="font-semibold text-[#00B8B0] hover:underline"
                                >
                                  {project.project_title}
                                </Link>
                              </td>

                              <td className="border-b border-gray-200 p-4 text-gray-700">
                                {project.project_status}
                              </td>

                              <td className="border-b border-gray-200 p-4 text-gray-700">
                                {project.task_count}
                              </td>

                              <td className="border-b border-gray-200 p-4 text-gray-700">
                                {project.todo_count}
                              </td>

                              <td className="border-b border-gray-200 p-4 text-gray-700">
                                {project.in_progress_count}
                              </td>

                              <td className="border-b border-gray-200 p-4 text-gray-700">
                                {project.completed_count}
                              </td>

                              <td className="border-b border-gray-200 p-4 text-gray-700">
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-300">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>

                                  <span>{progress}%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default GeneralMemberAnalyticsPage