import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { getProjectTypeLabel } from '../../../config/projectTypes'

function TeacherProjectAnalyticsPage() {
  const { projectId } = useParams()

  const [rows, setRows] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [studentAnalytics, setStudentAnalytics] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchProjectAnalytics()
  }, [projectId])

  async function fetchProjectAnalytics() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.rpc(
      'get_teacher_project_group_analytics',
      {
        project_uuid: projectId,
      }
    )

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setRows(data || [])
    setLoading(false)
  }

  async function fetchGroupStudentAnalytics(group) {
    setSelectedGroup(group)
    setLoadingStudents(true)
    setMessage('')

    const { data, error } = await supabase.rpc(
      'get_teacher_group_student_analytics',
      {
        project_uuid: projectId,
        group_uuid: group.group_id,
      }
    )

    if (error) {
      setMessage(error.message)
      setLoadingStudents(false)
      return
    }

    setStudentAnalytics(data || [])
    setLoadingStudents(false)
  }

  const projectInfo = rows?.[0] || null

  const totalGroups = rows.length

  const totalTasks = rows.reduce(
    (sum, row) => sum + Number(row.total_tasks || 0),
    0
  )

  const submittedTasks = rows.reduce(
    (sum, row) => sum + Number(row.submitted_tasks || 0),
    0
  )

  const completedGroups = rows.filter((row) => row.is_completed).length

  const overallCompletionRate =
    totalTasks > 0 ? Math.round((submittedTasks / totalTasks) * 100) : 0

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Project Analytics"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <Link
            to="/teacher/analytics"
            className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
          >
            <ChevronLeft size={18} />
            Back to Analytics
          </Link>
          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            {projectInfo?.project_title || 'Project Analytics'}
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            {projectInfo
              ? `${getProjectTypeLabel(projectInfo.project_type)} • ${
                  projectInfo.class_name
                } - ${projectInfo.section}`
              : 'Group performance analytics for this project.'}
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading project analytics...</p>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
            No analytics found for this project.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Card
                title="Groups"
                value={totalGroups}
                description="Groups in this class"
              />

              <Card
                title="Total Tasks"
                value={totalTasks}
                description="Across all groups"
              />

              <Card
                title="Submitted Tasks"
                value={submittedTasks}
                description={`${overallCompletionRate}% overall`}
              />

              <Card
                title="Completed Groups"
                value={`${completedGroups}/${totalGroups}`}
                description="Marked project complete"
              />
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-4 shadow-sm sm:p-6">
              <SectionHeader
                title="Group Analytics"
                description="Task progress and completion status per group."
              />

              <div className="space-y-4">
                {rows.map((row) => (
                  <div
                    key={row.group_id}
                    className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="break-words text-xl font-black text-gray-900">
                          {row.group_name}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          {row.is_completed
                            ? 'Project completed'
                            : 'Project not yet completed'}
                        </p>
                      </div>

                      <span className="w-fit rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0]">
                        {row.completion_rate}% complete
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                      <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                        <p className="text-gray-500">Total Tasks</p>
                        <p className="mt-1 font-bold text-gray-900">
                          {row.total_tasks}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                        <p className="text-gray-500">Submitted</p>
                        <p className="mt-1 font-bold text-gray-900">
                          {row.submitted_tasks}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                        <p className="text-gray-500">Remaining</p>
                        <p className="mt-1 font-bold text-gray-900">
                          {Number(row.total_tasks || 0) -
                            Number(row.submitted_tasks || 0)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                        <p className="text-gray-500">Completed At</p>
                        <p className="mt-1 font-bold text-gray-900">
                          {row.completed_at
                            ? new Date(row.completed_at).toLocaleString()
                            : 'Not completed'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-semibold text-gray-700">
                          Progress
                        </span>

                        <span className="font-semibold text-[#00B8B0]">
                          {row.completion_rate}%
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400"
                          style={{
                            width: `${Math.min(
                              Number(row.completion_rate || 0),
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <button
                        onClick={() => fetchGroupStudentAnalytics(row)}
                        className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90"
                      >
                        View Student Analytics
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedGroup && (
              <div className="rounded-3xl border border-gray-400 bg-white p-4 shadow-sm sm:p-6">
                <SectionHeader
                  title={`Student Analytics — ${selectedGroup.group_name}`}
                  description="Individual contribution analytics for this group."
                />

                {loadingStudents ? (
                  <p className="text-gray-500">Loading student analytics...</p>
                ) : studentAnalytics.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                    No student analytics found.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-3xl border border-gray-400">
                    <div className="max-h-[560px] overflow-x-auto overflow-y-auto">
                      <table className="w-full min-w-[920px] text-sm">
                        <thead className="sticky top-0 z-10 bg-gray-100">
                          <tr>
                            <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                              Student
                            </th>
                            <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                              Assigned
                            </th>
                            <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                              Submitted
                            </th>
                            <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                              In Progress
                            </th>
                            <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                              Pending
                            </th>
                            <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                              Uploads
                            </th>
                            <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                              Score
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {studentAnalytics.map((student) => (
                            <tr
                              key={student.student_id}
                              className="hover:bg-gray-50"
                            >
                              <td className="border-b border-gray-400 p-4">
                                <p className="font-black text-gray-900">
                                  {student.first_name} {student.last_name}
                                </p>

                                <p className="break-all text-xs text-gray-500">
                                  {student.email}
                                </p>
                              </td>

                              <td className="border-b border-gray-400 p-4 text-gray-700">
                                {student.assigned_tasks_count}
                              </td>

                              <td className="border-b border-gray-400 p-4 text-gray-700">
                                {student.submitted_tasks_count}
                              </td>

                              <td className="border-b border-gray-400 p-4 text-gray-700">
                                {student.in_progress_tasks_count}
                              </td>

                              <td className="border-b border-gray-400 p-4 text-gray-700">
                                {student.pending_tasks_count}
                              </td>

                              <td className="border-b border-gray-400 p-4 text-gray-700">
                                {student.total_uploads_count}
                              </td>

                              <td className="border-b border-gray-400 p-4">
                                <span className="rounded-full border border-[#00CFC8]/30 bg-cyan-50 px-3 py-1 font-black text-[#00B8B0]">
                                  {student.contribution_score}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default TeacherProjectAnalyticsPage