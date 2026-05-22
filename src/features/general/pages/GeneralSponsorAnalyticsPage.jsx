import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalSponsorNavigation } from '../config/generalNavigation'


function GeneralSponsorAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [projectProgress, setProjectProgress] = useState([])
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

    const { data: analyticsRows, error: analyticsError } = await supabase.rpc(
      'get_general_sponsor_analytics',
      {
        sponsor_uuid: user.id,
      }
    )

    if (analyticsError) {
      setMessage(analyticsError.message)
      setLoading(false)
      return
    }

    const { data: progressRows, error: progressError } = await supabase.rpc(
      'get_general_sponsor_project_progress',
      {
        sponsor_uuid: user.id,
      }
    )

    if (progressError) {
      setMessage(progressError.message)
      setLoading(false)
      return
    }

    setAnalytics(analyticsRows?.[0] || null)
    setProjectProgress(progressRows || [])
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
      navigation={generalSponsorNavigation}
    >
      <div className="space-y-6 text-white">
        <div>
          <p className="text-cyan-300 font-semibold uppercase tracking-widest">
            General Workplace
          </p>

          <h1 className="text-4xl font-black mt-2 bg-gradient-to-r from-cyan-300 to-green-400 bg-clip-text text-transparent">
            Sponsor Analytics
          </h1>

          <p className="text-gray-300 mt-2">
            Monitor sponsored project progress, task completion, and team activity.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <p>Loading analytics...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card
                title="Sponsored Projects"
                value={analytics?.total_projects || 0}
                description="Projects assigned to you"
              />

              <Card
                title="Active Projects"
                value={analytics?.active_projects || 0}
                description="Currently ongoing"
              />

              <Card
                title="Total Tasks"
                value={analytics?.total_tasks || 0}
                description="Across all projects"
              />

              <Card
                title="Completion Rate"
                value={`${completionRate}%`}
                description="Overall task completion"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur shadow-xl">
                <SectionHeader
                  title="Project Status"
                  description="Current sponsored project states."
                />

                <div className="space-y-4">
                  {[
                    {
                      label: 'Planning',
                      value: Number(analytics?.planning_projects || 0),
                    },
                    {
                      label: 'Active',
                      value: Number(analytics?.active_projects || 0),
                    },
                    {
                      label: 'Completed',
                      value: Number(analytics?.completed_projects || 0),
                    },
                  ].map((item) => {
                    const total = Number(analytics?.total_projects || 0)

                    const percent =
                      total > 0 ? Math.round((item.value / total) * 100) : 0

                    return (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold">{item.label}</span>

                          <span className="text-gray-300">
                            {item.value} project(s)
                          </span>
                        </div>

                        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
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

              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur shadow-xl">
                <SectionHeader
                  title="Task Summary"
                  description="Completion overview of sponsored projects."
                />

                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#001A5A]/70 border border-white/10 p-4">
                    <p className="text-gray-400">Completed Tasks</p>

                    <p className="text-3xl font-black mt-1">
                      {analytics?.completed_tasks || 0}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#001A5A]/70 border border-white/10 p-4">
                    <p className="text-gray-400">Pending Tasks</p>

                    <p className="text-3xl font-black mt-1">
                      {analytics?.pending_tasks || 0}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#001A5A]/70 border border-white/10 p-4">
                    <p className="text-gray-400">Unique Members</p>

                    <p className="text-3xl font-black mt-1">
                      {analytics?.total_members || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur shadow-xl">
                <SectionHeader
                  title="Sponsor Insight"
                  description="Summary of your sponsored projects."
                />

                <div className="rounded-2xl bg-[#001A5A]/70 border border-white/10 p-5">
                  <p className="text-gray-300 leading-relaxed">
                    You are currently sponsoring{' '}
                    <span className="font-black text-cyan-300">
                      {analytics?.total_projects || 0}
                    </span>{' '}
                    project(s) with{' '}
                    <span className="font-black text-cyan-300">
                      {analytics?.total_members || 0}
                    </span>{' '}
                    unique member(s). Overall task completion rate is{' '}
                    <span className="font-black text-cyan-300">
                      {completionRate}%
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur shadow-xl">
              <SectionHeader
                title="Sponsored Project Progress"
                description="Detailed overview of every sponsored project."
              />

              {projectProgress.length === 0 ? (
                <div className="border border-dashed border-white/20 rounded-3xl p-8 text-center text-gray-300">
                  No analytics available yet.
                </div>
              ) : (
                <div className="border border-white/10 rounded-3xl overflow-hidden">
                  <div className="max-h-[480px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#001A5A] sticky top-0 z-10">
                        <tr>
                          <th className="border-b border-white/10 p-4 text-left">
                            Project
                          </th>

                          <th className="border-b border-white/10 p-4 text-left">
                            Status
                          </th>

                          <th className="border-b border-white/10 p-4 text-left">
                            Priority
                          </th>

                          <th className="border-b border-white/10 p-4 text-left">
                            Members
                          </th>

                          <th className="border-b border-white/10 p-4 text-left">
                            Tasks
                          </th>

                          <th className="border-b border-white/10 p-4 text-left">
                            Progress
                          </th>

                          <th className="border-b border-white/10 p-4 text-left">
                            Deadline
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {projectProgress.map((project) => {
                          const taskCount = Number(project.task_count || 0)

                          const completedCount = Number(
                            project.completed_task_count || 0
                          )

                          const progress =
                            taskCount > 0
                              ? Math.round((completedCount / taskCount) * 100)
                              : 0

                          return (
                            <tr
                              key={project.project_id}
                              className="hover:bg-white/10"
                            >
                              <td className="border-b border-white/10 p-4 font-semibold">
                                <Link
                                  to={`/general/sponsor/projects/${project.project_id}`}
                                  className="text-cyan-300 hover:underline"
                                >
                                  {project.title}
                                </Link>
                              </td>

                              <td className="border-b border-white/10 p-4">
                                {project.status}
                              </td>

                              <td className="border-b border-white/10 p-4">
                                {project.priority}
                              </td>

                              <td className="border-b border-white/10 p-4">
                                {project.member_count}
                              </td>

                              <td className="border-b border-white/10 p-4">
                                {completedCount}/{taskCount}
                              </td>

                              <td className="border-b border-white/10 p-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-24 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>

                                  <span>{progress}%</span>
                                </div>
                              </td>

                              <td className="border-b border-white/10 p-4">
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
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default GeneralSponsorAnalyticsPage