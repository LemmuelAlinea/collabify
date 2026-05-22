import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalMemberNavigation } from '../config/generalNavigation'


function GeneralMemberTasksPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submissionTextMap, setSubmissionTextMap] = useState({})
  const [submissionsMap, setSubmissionsMap] = useState({})
  const [uploadingTaskId, setUploadingTaskId] = useState(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
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

    const { data, error } = await supabase.rpc('get_general_member_tasks', {
      member_uuid: user.id,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setTasks(data || [])
await fetchTaskSubmissions((data || []).map((task) => task.id))
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

  if (!file) {
    setMessage('No file selected.')
    return
  }

  if (!currentUser?.id) {
    setMessage('User not found.')
    return
  }

  setUploadingTaskId(task.id)

  // eslint-disable-next-line no-unused-vars
  const fileExt = file.name.includes('.')
    ? file.name.split('.').pop()
    : 'file'

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${task.project_id}/${task.id}/${Date.now()}-${safeFileName}`

  const { error: uploadError } = await supabase.storage
    .from('general-task-submissions')
    .upload(filePath, file, {
      upsert: false,
    })

  if (uploadError) {
    console.error(uploadError)
    setMessage(`Upload failed: ${uploadError.message}`)
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
    console.error(error)
    setMessage(`Database insert failed: ${error.message}`)
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

  setMessage('File uploaded successfully.')
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
      project_id: task.project_id,
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_started',
      description: `Task "${task.title}" was started.`,
    })

    await fetchTasks()
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
      project_id: task.project_id,
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_completed',
      description: `Task "${task.title}" was completed.`,
    })

    await fetchTasks()
  }

  const todoTasks = tasks.filter((task) => task.status === 'todo')
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress')
  const completedTasks = tasks.filter((task) => task.status === 'completed')

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Tasks"
      navigation={generalMemberNavigation}
    >
<div className="space-y-6 text-gray-900">
  <div>
    <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
      My Tasks
    </h1>

    <p className="mt-2 text-gray-500">
      Track and complete all tasks assigned to you across general projects.
    </p>
  </div>

  {message && (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
      {message}
    </div>
  )}

  {loading ? (
    <p className="text-gray-500">Loading tasks...</p>
  ) : (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card
          title="Total Tasks"
          value={tasks.length}
          description="Assigned to you"
        />

        <Card
          title="To Do"
          value={todoTasks.length}
          description="Not yet started"
        />

        <Card
          title="In Progress"
          value={inProgressTasks.length}
          description="Currently working"
        />

        <Card
          title="Completed"
          value={completedTasks.length}
          description="Finished tasks"
        />
      </div>

      <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
        <SectionHeader
          title="Assigned Tasks"
          description="Tasks assigned to you by project managers."
        />

        {tasks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
            No tasks assigned to you yet.
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-3xl border border-[#D6E4FF] bg-[#EAF2FF] p-5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#00B8B0]">
                      {task.project_title}
                    </p>

                    <h3 className="mt-1 text-xl font-black text-gray-900">
                      {task.title}
                    </h3>

                    <p className="mt-1 text-sm text-gray-700">
                      {task.description || 'No description.'}
                    </p>
                  </div>

                  <span className="rounded-full border border-[#00CFC8]/30 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0] shadow-sm">
                    {task.status}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                    <p className="text-gray-500">Priority</p>
                    <p className="font-bold text-gray-900">
                      {task.priority}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                    <p className="text-gray-500">Difficulty</p>
                    <p className="font-bold text-gray-900">
                      {task.difficulty}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                    <p className="text-gray-500">Due Date</p>

                    <p className="font-bold text-gray-900">
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString()
                        : 'None'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                    <p className="text-gray-500">Project Status</p>

                    <p className="font-bold text-gray-900">
                      {task.project_status}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
<Link
  to={`/general/member/projects/${task.project_id}/tasks/${task.id}`}
  className="h-11 border border-gray/20 px-5 rounded-xl font-semibold hover:bg-white/10 hover:scale-105 transition-all flex items-center justify-center"
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
                    <div className="flex h-11 items-center rounded-xl border border-green-300 bg-green-50 px-5 text-sm font-semibold text-green-700">
                      Completed
                    </div>
                  )}
                </div>

                {task.status === 'in_progress' && (
                  <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="mb-3 font-black text-[#00CFC8]">
                      Upload Your Work
                    </p>

                    <textarea
                      value={submissionTextMap[task.id] || ''}
                      onChange={(e) =>
                        handleSubmissionTextChange(
                          task.id,
                          e.target.value
                        )
                      }
                      placeholder="Write notes, links, explanations, or your work details..."
                      className="min-h-24 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />

                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        onClick={() => handleAddTextSubmission(task)}
                        className="h-11 rounded-xl border border-[#00CFC8]/40 bg-white px-5 font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                      >
                        Add Text Work
                      </button>

                      <label className="flex h-11 cursor-pointer items-center rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 font-black text-black transition-all hover:opacity-90">
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
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="mb-3 font-black text-[#00CFC8]">
                      Submitted Work
                    </p>

                    <div className="space-y-3">
                      {(submissionsMap[task.id] || []).map((submission) => (
                        <div
                          key={submission.id}
                          className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm"
                        >
                          {submission.submission_type === 'text' ? (
                            <p className="whitespace-pre-wrap text-gray-700">
                              {submission.content}
                            </p>
                          ) : (
                            <a
                              href={submission.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-[#00CFC8] hover:underline"
                            >
                              {submission.file_name}
                            </a>
                          )}

                          <p className="mt-2 text-xs text-gray-400">
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
                      task.sponsor_approval_status ===
                      'revision_requested'
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
                            : task.sponsor_approval_status ===
                                'approved'
                              ? 'bg-green-400'
                              : 'bg-cyan-400'
                        }`}
                      />

                      <p className="font-black uppercase tracking-wide text-gray-900">
                        Sponsor Approval:{' '}
                        {task.sponsor_approval_status}
                      </p>
                    </div>

                    {task.sponsor_approval_comment && (
                      <p className="mt-3 leading-relaxed text-gray-700">
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
    </>
  )}
</div>
    </DashboardLayout>
  )
}

export default GeneralMemberTasksPage