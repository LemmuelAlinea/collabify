import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalSponsorNavigation } from '../config/generalNavigation'

function GeneralSponsorProjectDetailsPage() {
  const { projectId } = useParams()

  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submissionsMap, setSubmissionsMap] = useState({})

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchProjectDetails()
  }, [projectId])

  async function fetchTaskSubmissions(taskIds) {
    if (!taskIds.length) {
      setSubmissionsMap({})
      return
    }

    const { data, error } = await supabase
      .from('general_task_submissions')
      .select('*')
      .in('task_id', taskIds)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      return
    }

    const grouped = {}

    ;(data || []).forEach((submission) => {
      if (!grouped[submission.task_id]) {
        grouped[submission.task_id] = []
      }

      grouped[submission.task_id].push(submission)
    })

    setSubmissionsMap(grouped)
  }

  async function fetchProjectDetails() {
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

    const { data: projectRows, error: projectError } = await supabase.rpc(
      'get_general_sponsor_project_details',
      {
        project_uuid: projectId,
        sponsor_uuid: user.id,
      }
    )

    if (projectError) {
      setMessage(projectError.message)
      setLoading(false)
      return
    }

    const projectData = projectRows?.[0] || null

    if (!projectData) {
      setMessage('Project not found or you are not assigned as the sponsor.')
      setLoading(false)
      return
    }

    const { data: memberRows } = await supabase.rpc(
      'get_general_project_members',
      {
        project_uuid: projectId,
      }
    )

    const { data: taskRows } = await supabase.rpc(
      'get_general_project_tasks',
      {
        project_uuid: projectId,
      }
    )

    const { data: activityRows } = await supabase
      .from('general_activity_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20)

    setProject(projectData)
    setMembers(memberRows || [])
    setTasks(taskRows || [])
    setActivities(activityRows || [])

    await fetchTaskSubmissions((taskRows || []).map((task) => task.id))

    setLoading(false)
  }

  if (loading) {
    return (
      <DashboardLayout
        title="General Workplace"
        pageTitle="Project Details"
        navigation={generalSponsorNavigation}
      >
        <p className="text-gray-500">Loading project details...</p>
      </DashboardLayout>
    )
  }

  if (!project) {
    return (
      <DashboardLayout
        title="General Workplace"
        pageTitle="Project Details"
        navigation={generalSponsorNavigation}
      >
        <p className="text-gray-500">{message || 'Project not found.'}</p>
      </DashboardLayout>
    )
  }

  const managerName = `${project.manager_first_name || ''} ${
    project.manager_last_name || ''
  }`.trim()

  const progress =
    Number(project.task_count) > 0
      ? Math.round(
          (Number(project.completed_task_count) /
            Number(project.task_count)) *
            100
        )
      : 0

  return (
    <DashboardLayout
      title="General Workplace"
      pageTitle="Project Details"
      navigation={generalSponsorNavigation}
    >
      <div className="space-y-6 text-gray-900">
<div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
  <div>
    <Link
      to="/general/sponsor/projects"
      className="text-sm font-semibold text-[#00B8B0] hover:underline"
    >
      Back to Sponsored Projects
    </Link>

    <h1 className="mt-3 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
      {project.title}
    </h1>

    <p className="mt-2 max-w-3xl text-gray-500">
      {project.description || 'No description provided.'}
    </p>
  </div>

  <div className="flex flex-wrap items-center gap-3">
    <Link
      to={`/general/sponsor/projects/${projectId}/chat`}
      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90"
    >
      Open Chat
    </Link>

  </div>
</div>

        {message && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 lg:grid-cols-5">
          <Card
            title="Status"
            value={project.status}
            description="Project state"
          />

          <Card
            title="Priority"
            value={project.priority}
            description="Project urgency"
          />

          <Card
            title="Members"
            value={project.member_count}
            description="Project team"
          />

          <Card
            title="Tasks"
            value={project.task_count}
            description="Total tasks"
          />

          <Card
            title="Progress"
            value={`${progress}%`}
            description="Completed task rate"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Project Information"
              description="Overview and delivery expectations."
            />

            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-500">Project Type</p>
                <p className="mt-1 font-bold text-gray-900">
                  {project.project_type}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-500">Project Manager</p>

                <p className="mt-1 font-bold text-gray-900">
                  {managerName || project.manager_email || 'Unknown'}
                </p>

                {project.manager_email && (
                  <p className="mt-1 text-gray-400">
                    {project.manager_email}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-500">Start Date</p>

                <p className="mt-1 font-bold text-gray-900">
                  {project.start_date
                    ? new Date(project.start_date).toLocaleString()
                    : 'Not set'}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-500">Deadline</p>

                <p className="mt-1 font-bold text-gray-900">
                  {project.deadline
                    ? new Date(project.deadline).toLocaleString()
                    : 'Not set'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="font-semibold text-gray-500">Objectives</p>

                <p className="mt-2 whitespace-pre-wrap text-gray-700">
                  {project.objectives || 'No objectives provided.'}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="font-semibold text-gray-500">
                  Expected Output
                </p>

                <p className="mt-2 whitespace-pre-wrap text-gray-700">
                  {project.expected_output ||
                    'No expected output provided.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Activity Feed"
              description="Recent project updates."
            />

            {activities.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                No activity yet.
              </div>
            ) : (
              <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-2xl border border-gray-200 bg-[#EAF2FF] p-4 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {activity.description}
                    </p>

                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Project Members"
              description="Team members assigned to this project."
            />

            {members.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                No members assigned yet.
              </div>
            ) : (
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[#D6E4FF] bg-[#EAF2FF] p-4 shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-gray-900">
                        {member.first_name} {member.last_name}
                      </p>

                      <p className="text-sm text-gray-500">
                        {member.email}
                      </p>
                    </div>

                    <span className="rounded-full border border-[#00CFC8]/30 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0] shadow-sm">
                      {member.project_role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

<div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
  <SectionHeader
    title="Project Tasks"
    description="Task progress across the project team."
  />

  {tasks.length === 0 ? (
    <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
      No tasks created yet.
    </div>
  ) : (
    <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
      {tasks.map((task) => {
        const assignedName = task.assigned_to
          ? `${task.assigned_first_name || ''} ${
              task.assigned_last_name || ''
            }`.trim() ||
            task.assigned_email ||
            'Assigned member'
          : 'Unassigned'

        return (
          <div
            key={task.id}
            className="rounded-2xl border border-[#D6E4FF] bg-[#cad7ec] p-5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-gray-900">
                  {task.title}
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  {task.description || 'No description.'}
                </p>
              </div>

              <span className="rounded-full border border-[#00CFC8]/30 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0] shadow-sm">
                {task.sponsor_approval_status === 'revision_requested'
                  ? 'revision_requested'
                  : task.sponsor_approval_status === 'pending'
                    ? 'pending_sponsor_approval'
                    : task.sponsor_approval_status === 'approved'
                      ? 'sponsor_approved'
                      : task.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <p className="text-gray-500">Assigned</p>
                <p className="font-semibold text-gray-900">
                  {assignedName}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <p className="text-gray-500">Priority</p>
                <p className="font-semibold capitalize text-gray-900">
                  {task.priority}
                </p>
              </div>
            </div>

            {(submissionsMap[task.id] || []).length > 0 && (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="mb-3 font-black text-[#00CFC8]">
                  Submitted Work
                </p>

                <div className="space-y-3">
                  {(submissionsMap[task.id] || []).map((submission) => (
                    <div
                      key={submission.id}
                      className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-3 text-sm"
                    >
                      {submission.submission_type === 'text' ? (
                        <p className="break-words whitespace-pre-wrap text-gray-700">
                          {submission.content}
                        </p>
                      ) : (
                        <a
                          href={submission.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#00CFC8] hover:underline"
                        >
                          {submission.file_name || 'Open uploaded file'}
                        </a>
                      )}

                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(submission.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {task.sponsor_approval_status && (
              <div
                className={`mt-3 rounded-xl border p-3 text-sm ${
                  task.sponsor_approval_status === 'revision_requested'
                    ? 'border-yellow-300 bg-yellow-100'
                    : task.sponsor_approval_status === 'approved'
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 bg-white'
                }`}
              >
                <p className="font-semibold text-[#00CFC8]">
                  Sponsor Approval: {task.sponsor_approval_status}
                </p>

                {task.sponsor_approval_comment && (
                  <p className="mt-2 text-gray-700">
                    Sponsor Comment: {task.sponsor_approval_comment}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                to={`/general/sponsor/projects/${projectId}/tasks/${task.id}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#00CFC8]/40 bg-white px-5 text-sm font-semibold text-[#00CFC8] transition-all hover:scale-105 hover:bg-gray-50 hover:shadow-md"
              >
                Open Task
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )}
</div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default GeneralSponsorProjectDetailsPage