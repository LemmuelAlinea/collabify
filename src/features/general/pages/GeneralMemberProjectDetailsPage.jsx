import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalMemberNavigation } from '../config/generalNavigation'

function GeneralMemberProjectDetailsPage() {
  const { projectId } = useParams()

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submissionTextMap, setSubmissionTextMap] = useState({})
  const [submissionsMap, setSubmissionsMap] = useState({})
  const [uploadingTaskId, setUploadingTaskId] = useState(null)

  useEffect(() => {
    fetchProjectDetails()
  }, [projectId])

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

    setCurrentUser(user)

    const { data: projectRows, error: projectError } = await supabase.rpc(
      'get_general_member_project_details',
      {
        project_uuid: projectId,
        member_uuid: user.id,
      }
    )

    if (projectError) {
      setMessage(projectError.message)
      setLoading(false)
      return
    }

    const projectData = projectRows?.[0] || null

    if (!projectData) {
      setMessage('Project not found or you are not assigned to this project.')
      setLoading(false)
      return
    }

    const { data: taskRows, error: taskError } = await supabase.rpc(
      'get_general_project_tasks',
      {
        project_uuid: projectId,
      }
    )

    if (taskError) {
      setMessage(taskError.message)
      setLoading(false)
      return
    }

    const { data: activityRows } = await supabase
      .from('general_activity_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20)

    setProject(projectData)
    setTasks(taskRows || [])

    await fetchTaskSubmissions(
      (taskRows || [])
        .filter((task) => task.assigned_to === user.id)
        .map((task) => task.id)
    )

    setActivities(activityRows || [])
    setLoading(false)
  }

  async function fetchTaskSubmissions(taskIds) {
    if (!taskIds.length) return

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

    ;(data || []).forEach((item) => {
      if (!grouped[item.task_id]) grouped[item.task_id] = []
      grouped[item.task_id].push(item)
    })

    setSubmissionsMap(grouped)
  }

  function handleSubmissionTextChange(taskId, value) {
    setSubmissionTextMap({
      ...submissionTextMap,
      [taskId]: value,
    })
  }

  async function handleAddTextSubmission(task) {
    setMessage('')

    const content = submissionTextMap[task.id]?.trim()

    if (!content) {
      setMessage('Please enter your work text before submitting.')
      return
    }

    const { error } = await supabase.from('general_task_submissions').insert({
      task_id: task.id,
      project_id: task.project_id,
      member_id: currentUser.id,
      submission_type: 'text',
      content,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase.from('general_activity_logs').insert({
      project_id: task.project_id,
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_text_submitted',
      description: `Text work was added to task "${task.title}".`,
    })

    setSubmissionTextMap({
      ...submissionTextMap,
      [task.id]: '',
    })

    await fetchTaskSubmissions([task.id])
  }

  async function handleUploadSubmissionFile(task, file) {
    setMessage('')

    if (!file) return

    setUploadingTaskId(task.id)

    const fileExt = file.name.split('.').pop()
    const filePath = `${task.project_id}/${task.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('general-task-submissions')
      .upload(filePath, file)

    if (uploadError) {
      setMessage(uploadError.message)
      setUploadingTaskId(null)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('general-task-submissions')
      .getPublicUrl(filePath)

    const { error } = await supabase.from('general_task_submissions').insert({
      task_id: task.id,
      project_id: task.project_id,
      member_id: currentUser.id,
      submission_type: 'file',
      file_name: file.name,
      file_path: filePath,
      file_url: publicUrlData.publicUrl,
    })

    if (error) {
      setMessage(error.message)
      setUploadingTaskId(null)
      return
    }

    await supabase.from('general_activity_logs').insert({
      project_id: task.project_id,
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_file_uploaded',
      description: `File "${file.name}" was uploaded for task "${task.title}".`,
    })

    setUploadingTaskId(null)
    await fetchTaskSubmissions([task.id])
  }

  async function handleStartTask(task) {
    setMessage('')

    if (task.assigned_to !== currentUser?.id) {
      setMessage('You can only start tasks assigned to you.')
      return
    }

    const { error } = await supabase
      .from('general_tasks')
      .update({
        status: 'in_progress',
      })
      .eq('id', task.id)
      .eq('assigned_to', currentUser.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase.from('general_activity_logs').insert({
      project_id: projectId,
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_started',
      description: `Task "${task.title}" was started.`,
    })

    await fetchProjectDetails()
  }

  async function handleCompleteTask(task) {
    setMessage('')

    if (task.assigned_to !== currentUser?.id) {
      setMessage('You can only complete tasks assigned to you.')
      return
    }

    const { error } = await supabase
      .from('general_tasks')
      .update({
        status: 'completed',
        sponsor_approval_status: null,
        sponsor_approval_comment: null,
        sponsor_approval_requested_at: null,
        sponsor_approval_requested_by: null,
        sponsor_approval_decided_at: null,
        sponsor_approval_decided_by: null,
      })
      .eq('id', task.id)
      .eq('assigned_to', currentUser.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase.from('general_activity_logs').insert({
      project_id: projectId,
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_completed',
      description: `Task "${task.title}" was completed.`,
    })

    await fetchProjectDetails()
  }

  const myTasks = tasks.filter((task) => task.assigned_to === currentUser?.id)

  const completedTasks = myTasks.filter(
    (task) => task.status === 'completed' || task.status === 'submitted'
  )

  const pendingTasks = myTasks.filter(
    (task) => task.status !== 'completed' && task.status !== 'submitted'
  )

  if (loading) {
    return (
      <DashboardLayout
        title="General Workplace"
        pageTitle="Project Details"
        navigation={generalMemberNavigation}
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
        navigation={generalMemberNavigation}
      >
        <p className="text-gray-500">{message || 'Project not found.'}</p>
      </DashboardLayout>
    )
  }

  const managerName = `${project.manager_first_name || ''} ${
    project.manager_last_name || ''
  }`.trim()

  const sponsorName = `${project.sponsor_first_name || ''} ${
    project.sponsor_last_name || ''
  }`.trim()

  return (
    <DashboardLayout
      title="General Workplace"
      pageTitle="Project Details"
      navigation={generalMemberNavigation}
    >
      <div className="space-y-6 text-gray-900">
<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
  <div>
    <Link
      to="/general/member/projects"
      className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
    >
      <ChevronLeft size={18} />
      Back to My Projects
    </Link>

    <h1 className="mt-3 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
      {project.title}
    </h1>

    <p className="mt-2 max-w-3xl text-gray-500">
      {project.description || 'No description provided.'}
    </p>
  </div>

  <div className="flex items-start">
    <Link
      to={`/general/member/projects/${projectId}/chat`}
      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90"
    >
      Open Chat
    </Link>
  </div>
</div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
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
            title="My Tasks"
            value={myTasks.length}
            description="Assigned to you"
          />

          <Card
            title="Pending"
            value={pendingTasks.length}
            description="Tasks to finish"
          />

          <Card
            title="Completed"
            value={`${completedTasks.length}/${myTasks.length}`}
            description="Finished assigned tasks"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm xl:col-span-2">
            <SectionHeader
              title="Project Information"
              description="General project details and expected outputs."
            />

            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
                <p className="text-gray-500">Project Type</p>
                <p className="mt-1 font-bold text-gray-900">
                  {project.project_type}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
                <p className="text-gray-500">Deadline</p>
                <p className="mt-1 font-bold text-gray-900">
                  {project.deadline
                    ? new Date(project.deadline).toLocaleString()
                    : 'Not set'}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
                <p className="text-gray-500">Project Manager</p>
                <p className="mt-1 font-bold text-gray-900">
                  {managerName || project.manager_email || 'Unknown'}
                </p>

                {project.manager_email && (
                  <p className="mt-1 break-all text-gray-500">
                    {project.manager_email}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
                <p className="text-gray-500">Project Sponsor</p>
                <p className="mt-1 font-bold text-gray-900">
                  {sponsorName || project.sponsor_email || 'No sponsor'}
                </p>

                {project.sponsor_email && (
                  <p className="mt-1 break-all text-gray-500">
                    {project.sponsor_email}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                <p className="font-semibold text-gray-500">Objectives</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-gray-700">
                  {project.objectives || 'No objectives provided.'}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                <p className="font-semibold text-gray-500">Expected Output</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-gray-700">
                  {project.expected_output || 'No expected output provided.'}
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
              <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                No activity yet.
              </div>
            ) : (
              <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4"
                  >
                    <p className="break-words text-sm font-semibold text-gray-900">
                      {activity.description}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <SectionHeader
            title="My Assigned Tasks"
            description="Tasks assigned to you by the project manager."
          />

          {myTasks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
              No tasks assigned to you yet.
            </div>
          ) : (
            <div className="space-y-4">
              {myTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="break-words text-xl font-black text-gray-900">
                        {task.title}
                      </h3>

                      <p className="mt-1 break-words text-sm text-gray-600">
                        {task.description || 'No description.'}
                      </p>
                    </div>

                    <span className="w-fit rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0]">
                      {task.status}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                    <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                      <p className="text-gray-500">Priority</p>
                      <p className="font-bold text-gray-900">
                        {task.priority}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                      <p className="text-gray-500">Difficulty</p>
                      <p className="font-bold text-gray-900">
                        {task.difficulty}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                      <p className="text-gray-500">Category</p>
                      <p className="font-bold text-gray-900">
                        {task.category}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                      <p className="text-gray-500">Due Date</p>
                      <p className="font-bold text-gray-900">
                        {task.due_date
                          ? new Date(task.due_date).toLocaleDateString()
                          : 'None'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <Link
                      to={`/general/member/projects/${projectId}/tasks/${task.id}`}
                      className="flex h-11 items-center justify-center rounded-xl border border-[#00CFC8]/40 bg-white px-5 font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                    >
                      Open Task
                    </Link>

                    {task.status === 'todo' && (
                      <button
                        onClick={() => handleStartTask(task)}
                        className="h-11 rounded-xl border border-[#00CFC8]/40 bg-white px-5 font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                      >
                        Start Task
                      </button>
                    )}

                    {task.status !== 'completed' && (
                      <button
                        onClick={() => handleCompleteTask(task)}
                        className="h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 font-black text-black transition-all hover:opacity-90"
                      >
                        Mark Completed
                      </button>
                    )}

                    {task.status === 'completed' && (
                      <div className="flex h-11 items-center justify-center rounded-xl border border-green-300 bg-green-50 px-5 text-sm font-semibold text-green-700">
                        Completed
                      </div>
                    )}
                  </div>

                  {task.status === 'in_progress' && (
                    <div className="mt-5 rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                      <p className="mb-3 font-black text-[#00B8B0]">
                        Upload Your Work
                      </p>

                      <textarea
                        value={submissionTextMap[task.id] || ''}
                        onChange={(e) =>
                          handleSubmissionTextChange(task.id, e.target.value)
                        }
                        placeholder="Write notes, links, explanations, or your work details..."
                        className="min-h-24 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                      />

                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <button
                          onClick={() => handleAddTextSubmission(task)}
                          className="h-11 rounded-xl border border-[#00CFC8]/40 bg-white px-5 font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                        >
                          Add Text Work
                        </button>

                        <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 font-black text-black transition-all hover:opacity-90">
                          {uploadingTaskId === task.id
                            ? 'Uploading...'
                            : 'Upload File'}

                          <input
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              await handleUploadSubmissionFile(task, file)
                              e.target.value = ''
                            }}
                            disabled={uploadingTaskId === task.id}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {(submissionsMap[task.id] || []).length > 0 && (
                    <div className="mt-4 rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                      <p className="mb-3 font-black text-[#00B8B0]">
                        Submitted Work
                      </p>

                      <div className="space-y-3">
                        {(submissionsMap[task.id] || []).map((submission) => (
                          <div
                            key={submission.id}
                            className="min-w-0 overflow-hidden rounded-xl border border-gray-400 bg-[#EAF2FF] p-3 text-sm"
                          >
                            {submission.submission_type === 'text' ? (
                              <p className="max-w-full overflow-hidden break-all whitespace-pre-wrap text-gray-700">
                                {submission.content}
                              </p>
                            ) : (
                              <a
                                href={submission.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="break-all font-semibold text-[#00B8B0] hover:underline"
                              >
                                {submission.file_name}
                              </a>
                            )}

                            <p className="mt-2 text-xs text-gray-500">
                              {new Date(
                                submission.created_at
                              ).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {task.sponsor_approval_status && (
                    <div
                      className={`mt-4 rounded-2xl border p-4 text-sm ${
                        task.sponsor_approval_status === 'revision_requested'
                          ? 'border-yellow-300 bg-yellow-50'
                          : task.sponsor_approval_status === 'approved'
                            ? 'border-green-300 bg-green-50'
                            : 'border-cyan-300 bg-cyan-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            task.sponsor_approval_status ===
                            'revision_requested'
                              ? 'bg-yellow-400'
                              : task.sponsor_approval_status === 'approved'
                                ? 'bg-green-400'
                                : 'bg-cyan-400'
                          }`}
                        />

                        <p className="font-black uppercase tracking-wide text-gray-900">
                          Sponsor Approval: {task.sponsor_approval_status}
                        </p>
                      </div>

                      {task.sponsor_approval_comment && (
                        <p className="mt-3 break-words leading-relaxed text-gray-700">
                          {task.sponsor_approval_comment}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default GeneralMemberProjectDetailsPage