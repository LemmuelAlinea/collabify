import { useEffect, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalManagerNavigation } from '../config/generalNavigation'

function GeneralManagerEvaluationPage() {
  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchEvaluations()
  }, [])

  async function fetchEvaluations() {
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
      'get_general_manager_member_evaluations',
      {
        manager_uuid: user.id,
      }
    )

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setEvaluations(data || [])
    setLoading(false)
  }

  function getFullName(member) {
    return `${member.first_name || ''} ${member.last_name || ''}`.trim()
  }

  function getCompletionRate(member) {
    const assigned = Number(member.assigned_tasks || 0)
    const completed = Number(member.completed_tasks || 0)

    if (assigned === 0) return 0

    return Math.round((completed / assigned) * 100)
  }

  function getPerformanceLabel(member) {
    const completionRate = getCompletionRate(member)
    const approved = Number(member.approved_tasks || 0)
    const revisions = Number(member.revision_tasks || 0)

    if (completionRate >= 85 && approved >= revisions) return 'Excellent'
    if (completionRate >= 60) return 'Good'
    if (completionRate >= 30) return 'Needs Monitoring'
    return 'Needs Support'
  }

  function getSuggestedScore(member) {
    const completionRate = getCompletionRate(member)
    const approved = Number(member.approved_tasks || 0)
    const submissions = Number(member.submitted_work_count || 0)
    const revisions = Number(member.revision_tasks || 0)

    let score = completionRate

    score += Math.min(approved * 3, 10)
    score += Math.min(submissions * 2, 10)
    score -= Math.min(revisions * 5, 20)

    if (score > 100) return 100
    if (score < 0) return 0

    return score
  }

  function getReliability(member) {
    const completionRate = getCompletionRate(member)
    const overdue = Number(member.overdue_tasks || 0)
    const revisions = Number(member.revision_tasks || 0)

    if (completionRate >= 85 && overdue === 0 && revisions <= 1)
      return 'High'

    if (completionRate >= 60 && overdue <= 1) return 'Good'

    if (completionRate >= 35) return 'Needs Monitoring'

    return 'Low'
  }

  function getWorkQuality(member) {
    const approved = Number(member.approved_tasks || 0)
    const revisions = Number(member.revision_tasks || 0)

    if (approved > 0 && revisions === 0) return 'High Quality'

    if (approved >= revisions) return 'Good Quality'

    if (revisions > approved) return 'Needs Improvement'

    return 'Not Yet Reviewed'
  }

  function getDeadlineDiscipline(member) {
    const overdue = Number(member.overdue_tasks || 0)

    if (overdue === 0) return 'On Track'

    if (overdue <= 2) return 'At Risk'

    return 'Needs Attention'
  }

  function getContributionLevel(member) {
    const submissions = Number(member.submitted_work_count || 0)
    const completed = Number(member.completed_tasks || 0)

    if (submissions >= 8 || completed >= 6) return 'High'

    if (submissions >= 3 || completed >= 3) return 'Active'

    if (submissions >= 1 || completed >= 1) return 'Limited'

    return 'Low'
  }

  function getCollaboration(member) {
    const activity = Number(member.activity_count || 0)
    const submissions = Number(member.submitted_work_count || 0)

    if (activity >= 10 || submissions >= 6) return 'Strong'

    if (activity >= 4 || submissions >= 3) return 'Active'

    if (activity >= 1 || submissions >= 1) return 'Low'

    return 'No Activity'
  }

  function getRevisionRecovery(member) {
    const revisions = Number(member.revision_tasks || 0)
    const approved = Number(member.approved_tasks || 0)

    if (revisions === 0) return 'No Revisions'

    if (approved >= revisions) return 'Recovered Well'

    return 'Needs Follow-up'
  }

  function getBadgeClass(value) {
    const goodValues = [
      'Excellent',
      'High',
      'Good',
      'High Quality',
      'Good Quality',
      'On Track',
      'Active',
      'Strong',
      'Recovered Well',
      'No Revisions',
    ]

    const warningValues = [
      'Needs Monitoring',
      'At Risk',
      'Limited',
      'Low',
      'Not Yet Reviewed',
    ]

    if (goodValues.includes(value)) {
      return 'border-[#00CFC8]/30 bg-cyan-50 text-[#00B8B0]'
    }

    if (warningValues.includes(value)) {
      return 'border-yellow-300 bg-yellow-50 text-yellow-700'
    }

    return 'border-red-300 bg-red-50 text-red-700'
  }

  function MetricBadge({ value }) {
    return (
      <span
        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getBadgeClass(
          value
        )}`}
      >
        {value}
      </span>
    )
  }

  const filteredEvaluations = evaluations.filter((member) => {
    const fullName = getFullName(member).toLowerCase()
    const email = String(member.email || '').toLowerCase()
    const search = searchTerm.toLowerCase()

    const matchesSearch =
      fullName.includes(search) || email.includes(search)

    const performanceLabel = getPerformanceLabel(member)
      .toLowerCase()
      .replace(/\s+/g, '_')

    const matchesStatus =
      statusFilter === 'all' || performanceLabel === statusFilter

    return matchesSearch && matchesStatus
  })

  const totalMembers = evaluations.length

  const totalAssignedTasks = evaluations.reduce(
    (sum, member) => sum + Number(member.assigned_tasks || 0),
    0
  )

  const totalCompletedTasks = evaluations.reduce(
    (sum, member) => sum + Number(member.completed_tasks || 0),
    0
  )

  const averageCompletion =
    totalAssignedTasks > 0
      ? Math.round((totalCompletedTasks / totalAssignedTasks) * 100)
      : 0

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Evaluation"
      navigation={generalManagerNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Evaluation
          </h1>

          <p className="mt-2 max-w-4xl text-gray-500">
            Review member reliability, work quality, deadlines, contribution,
            collaboration, and revision recovery across managed projects.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading evaluations...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Card
                title="Evaluated Members"
                value={totalMembers}
                description="Members across your projects"
              />

              <Card
                title="Assigned Tasks"
                value={totalAssignedTasks}
                description="Total assigned work"
              />

              <Card
                title="Completed Tasks"
                value={totalCompletedTasks}
                description="Finished member tasks"
              />

              <Card
                title="Average Completion"
                value={`${averageCompletion}%`}
                description="Overall completion rate"
              />
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <SectionHeader
                  title="Member Overview"
                  description="Search and filter members before reviewing detailed evaluation sections."
                />

                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:min-w-[420px]">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search member..."
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8] lg:w-60"
                  />

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 outline-none focus:border-[#00CFC8] lg:w-52"
                  >
                    <option value="all">All Status</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="needs_monitoring">
                      Needs Monitoring
                    </option>
                    <option value="needs_support">
                      Needs Support
                    </option>
                  </select>
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Showing {filteredEvaluations.length} of {evaluations.length}{' '}
                member(s)
              </p>
            </div>

            {filteredEvaluations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                No matching member evaluation data found.
              </div>
            ) : (
              <div className="space-y-6">
                {filteredEvaluations.map((member) => {
                  const fullName = getFullName(member)
                  const completionRate = getCompletionRate(member)
                  const suggestedScore = getSuggestedScore(member)
                  const performanceLabel = getPerformanceLabel(member)

                  const reliability = getReliability(member)
                  const workQuality = getWorkQuality(member)
                  const deadline = getDeadlineDiscipline(member)
                  const contribution = getContributionLevel(member)
                  const collaboration = getCollaboration(member)
                  const revisionRecovery = getRevisionRecovery(member)

                  return (
                    <div
                      key={member.member_id}
                      className="rounded-3xl border border-gray-00 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h2 className="text-2xl font-black text-gray-900">
                            {fullName || 'Unnamed Member'}
                          </h2>

                          <p className="mt-1 break-all text-sm text-gray-500">
                            {member.email}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-[#00CFC8]/30 bg-cyan-50 px-3 py-1 text-sm font-black text-[#00B8B0]">
                            Score: {suggestedScore}
                          </span>

                          <MetricBadge value={performanceLabel} />
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4">
                          <p className="text-sm text-gray-500">Projects</p>
                          <p className="mt-1 text-2xl font-black text-gray-900">
                            {member.project_count}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4">
                          <p className="text-sm text-gray-500">Tasks</p>
                          <p className="mt-1 text-2xl font-black text-gray-900">
                            {member.assigned_tasks}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4">
                          <p className="text-sm text-gray-500">Completed</p>
                          <p className="mt-1 text-2xl font-black text-gray-900">
                            {member.completed_tasks}/{member.assigned_tasks}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[#00B8B0]">
                            {completionRate}%
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4">
                          <p className="text-sm text-gray-500">Submitted Work</p>

                          <p className="mt-1 text-2xl font-black text-gray-900">
                            {member.submitted_work_count}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-3">
                        {[
                          {
                            title: 'Reliability',
                            value: reliability,
                            description:
                              'Based on completion rate, overdue tasks, unfinished work, and revision frequency.',
                          },
                          {
                            title: 'Work Quality',
                            value: workQuality,
                            description:
                              'Based on sponsor approvals compared with revision requests and review results.',
                          },
                          {
                            title: 'Deadline Discipline',
                            value: deadline,
                            description:
                              'Based on overdue unfinished tasks and current deadline risk.',
                          },
                          {
                            title: 'Contribution Level',
                            value: contribution,
                            description:
                              'Based on completed tasks and submitted work.',
                          },
                          {
                            title: 'Collaboration',
                            value: collaboration,
                            description:
                              'Based on activity logs, task engagement, and participation.',
                          },
                          {
                            title: 'Revision Recovery',
                            value: revisionRecovery,
                            description:
                              'Based on how well the member recovers from revisions.',
                          },
                        ].map((item) => (
                          <div
                            key={item.title}
                            className="rounded-2xl border border-[#044b77] bg-[#9cd7e0] p-3 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black text-[#00B8B0]">
                                  {item.title}
                                </p>

                                <button
                                  type="button"
                                  title={item.description}
                                  className="flex h-5 w-5 items-center justify-center rounded-full border border-[#00CFC8]/40 bg-white text-xs font-black text-[#00B8B0] hover:bg-cyan-50"
                                >
                                  ?
                                </button>
                              </div>

                              <MetricBadge value={item.value} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                        <div className="rounded-2xl border border-gray-400 bg-white p-3">
                          <p className="text-gray-400">Approved</p>

                          <p className="font-black text-gray-900">
                            {member.approved_tasks}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-white p-3">
                          <p className="text-gray-400">Revisions</p>

                          <p className="font-black text-gray-900">
                            {member.revision_tasks}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-white p-3">
                          <p className="text-gray-400">To Do</p>

                          <p className="font-black text-gray-900">
                            {member.todo_tasks}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-white p-3">
                          <p className="text-gray-400">In Progress</p>

                          <p className="font-black text-gray-900">
                            {member.in_progress_tasks}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-white p-3">
                          <p className="text-gray-400">Overdue</p>

                          <p className="font-black text-gray-900">
                            {member.overdue_tasks || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default GeneralManagerEvaluationPage