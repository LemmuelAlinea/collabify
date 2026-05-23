import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'

function TeacherTaskDetailsPage() {
  const { taskId } = useParams()

  const [task, setTask] = useState(null)
  const [versions, setVersions] = useState([])
  const [activities, setActivities] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchTaskDetails()
  }, [taskId])

  function getBackLink() {
    if (task?.project_id) return `/teacher/projects/${task.project_id}`
    return '/teacher/classes'
  }

  async function addActivity(description, activityType = 'teacher_task_updated') {
    await supabase.from('task_activity_logs').insert({
      task_id: taskId,
      user_id: currentUser?.id,
      activity_type: activityType,
      description,
    })

    setActivities((current) => [
      {
        id: `temp-${Date.now()}`,
        task_id: taskId,
        activity_type: activityType,
        description,
        created_at: new Date().toISOString(),
      },
      ...current,
    ])
  }

  async function fetchTaskDetails() {
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

    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        projects (
          id,
          title,
          class_id,
          classes (
            id,
            class_name,
            section,
            teacher_id
          )
        ),
        profiles:assigned_to (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', taskId)
      .maybeSingle()

    if (taskError) {
      setMessage(taskError.message)
      setLoading(false)
      return
    }

    if (!taskData) {
      setMessage('Task not found.')
      setLoading(false)
      return
    }

    const { data: versionRows } = await supabase
      .from('task_versions')
      .select(`
        *,
        profiles:uploaded_by (
          first_name,
          last_name,
          email
        )
      `)
      .eq('task_id', taskId)
      .order('version_number', { ascending: false })

    const { data: submissionRows } = await supabase
      .from('task_submissions')
      .select(`
        *,
        profiles:submitted_by (
          first_name,
          last_name,
          email
        ),
        task_versions:final_version_id (
          id,
          file_name,
          file_path,
          file_url,
          file_type,
          text_content,
          version_number
        )
      `)
      .eq('task_id', taskId)
      .order('submitted_at', { ascending: false })

    const { data: activityRows } = await supabase
      .from('task_activity_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    setTask(taskData)
    setVersions(versionRows || [])
    setSubmissions(submissionRows || [])
    setActivities(activityRows || [])
    setLoading(false)
  }

  function getStudentName() {
    const profile = task?.profiles

    if (!profile) return 'Unassigned'

    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
  }

  function getVersionUrl(version) {
    if (version.file_path) {
      const { data } = supabase.storage
        .from('task-files')
        .getPublicUrl(version.file_path)

      return data.publicUrl
    }

    return version.file_url || ''
  }

  function renderVersion(version) {
    if (version.file_type === 'text' || version.text_content) {
      return (
        <p className="max-w-full overflow-hidden break-all whitespace-pre-wrap text-gray-700">
          {version.text_content}
        </p>
      )
    }

    const fileName = version.file_name || ''
    const fileUrl = getVersionUrl(version)
    const lowerName = fileName.toLowerCase()

    if (!fileUrl) {
      return <p className="text-sm text-gray-500">No file URL available.</p>
    }

    if (lowerName.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
      return (
        <div className="mt-3">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-h-[520px] w-full rounded-2xl border border-gray-200 bg-white object-contain"
          />

          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block break-all text-sm font-semibold text-[#00B8B0] hover:underline"
          >
            Open image in new tab
          </a>
        </div>
      )
    }

    if (lowerName.match(/\.pdf$/i)) {
      return (
        <div className="mt-3 space-y-3">
          <iframe
            src={fileUrl}
            title={fileName}
            className="h-[620px] w-full rounded-2xl border border-gray-200 bg-white"
          />

          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block break-all text-sm font-semibold text-[#00B8B0] hover:underline"
          >
            Open PDF in new tab
          </a>
        </div>
      )
    }

    if (lowerName.match(/\.(mp4|webm|ogg)$/i)) {
      return (
        <div className="mt-3 space-y-3">
          <video
            src={fileUrl}
            controls
            className="max-h-[520px] w-full rounded-2xl border border-gray-200 bg-black"
          />

          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block break-all text-sm font-semibold text-[#00B8B0] hover:underline"
          >
            Open video in new tab
          </a>
        </div>
      )
    }

    if (lowerName.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      return (
        <div className="mt-3 space-y-3">
          <audio src={fileUrl} controls className="w-full" />

          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block break-all text-sm font-semibold text-[#00B8B0] hover:underline"
          >
            Open audio in new tab
          </a>
        </div>
      )
    }

    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
      >
        Open {fileName || 'uploaded file'}
      </a>
    )
  }

  async function handleMarkCompleted() {
    const confirmed = window.confirm('Mark this task as completed?')
    if (!confirmed) return

    setActionLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    if (error) {
      setMessage(error.message)
      setActionLoading(false)
      return
    }

    setTask((current) => ({
      ...current,
      status: 'completed',
    }))

    await addActivity(`Teacher marked task "${task.title}" as completed.`, 'task_completed')
    setActionLoading(false)
  }

  async function handleRequestRevision() {
    const confirmed = window.confirm('Request revision for this task?')
    if (!confirmed) return

    setActionLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'revision_requested',
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    if (error) {
      setMessage(error.message)
      setActionLoading(false)
      return
    }

    setTask((current) => ({
      ...current,
      status: 'revision_requested',
    }))

    await addActivity(
      `Teacher requested revision for task "${task.title}".`,
      'revision_requested'
    )

    setActionLoading(false)
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Collabify"
        pageTitle="Task Details"
        navigation={teacherNavigation}
      >
        <p className="text-gray-500">Loading task details...</p>
      </DashboardLayout>
    )
  }

  if (!task) {
    return (
      <DashboardLayout
        title="Collabify"
        pageTitle="Task Details"
        navigation={teacherNavigation}
      >
        <p className="text-gray-500">{message || 'Task not found.'}</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Task Details"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <Link
            to={getBackLink()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
          >
            <ChevronLeft size={18} />
            Back to Project
          </Link>

          <h1 className="mt-3 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            {task.title}
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            {task.description || 'No description provided.'}
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Card title="Status" value={task.status} description="Current task state" />

          <Card
            title="Assigned To"
            value={getStudentName()}
            description={task.profiles?.email || 'Student owner'}
          />

          <Card
            title="Priority"
            value={task.priority || 'medium'}
            description="Task urgency"
          />

          <Card
            title="Due Date"
            value={
              task.due_date
                ? new Date(task.due_date).toLocaleDateString()
                : 'None'
            }
            description="Submission deadline"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm xl:col-span-2">
            <SectionHeader
              title="Submitted Work"
              description="Review files, text work, final versions, and submissions uploaded for this task."
            />

            {versions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                No submitted work yet.
              </div>
            ) : (
              <div className="space-y-4">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="min-w-0 overflow-hidden rounded-2xl border border-[#D6E4FF] bg-[#EAF2FF] p-4 shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-black text-gray-900">
                            Version {version.version_number || '?'}{' '}
                            {version.is_final ? '— Final Version' : ''}
                          </p>

                          <p className="mt-1 break-all text-sm text-gray-500">
                            {version.file_name || 'Text Work'}
                          </p>
                        </div>

                        {version.is_final && (
                          <span className="w-fit rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                            FINAL
                          </span>
                        )}
                      </div>

                      <div className="mt-3">{renderVersion(version)}</div>

                      <p className="mt-3 text-xs text-gray-400">
                        Uploaded by{' '}
                        {`${version.profiles?.first_name || ''} ${
                          version.profiles?.last_name || ''
                        }`.trim() ||
                          version.profiles?.email ||
                          'Unknown'}{' '}
                        • {new Date(version.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Teacher Actions"
                description="Review and update the task status."
              />

              <div className="space-y-3">
                {task.status === 'submitted' && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleMarkCompleted}
                      className="h-11 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving...' : 'Mark as Completed'}
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleRequestRevision}
                      className="h-11 w-full rounded-xl border border-orange-300 bg-orange-50 font-semibold text-orange-700 transition-all hover:bg-orange-100 disabled:opacity-50"
                    >
                      Request Revision
                    </button>
                  </>
                )}

                {task.status === 'completed' && (
                  <div className="rounded-2xl border border-green-300 bg-green-50 p-4 text-sm font-black text-green-700">
                    This task is already completed.
                  </div>
                )}

                {task.status !== 'submitted' && task.status !== 'completed' && (
                  <div className="rounded-2xl border border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                    This task has not been submitted yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Submission Records"
                description="Final submission history."
              />

              {submissions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No final submission yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4"
                    >
                      <p className="font-black text-gray-900">
                        Submitted by{' '}
                        {`${submission.profiles?.first_name || ''} ${
                          submission.profiles?.last_name || ''
                        }`.trim() ||
                          submission.profiles?.email ||
                          'Unknown'}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleString()
                          : 'No submission date'}
                      </p>

                      <p className="mt-2 text-sm font-semibold text-[#00B8B0]">
                        Final Version:{' '}
                        {submission.task_versions?.version_number || 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Task Activity"
            description="Recent activity for this task."
          />

          {activities.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              No task activity yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-2xl border border-[#D6E4FF] bg-[#EAF2FF] p-4 shadow-sm"
                >
                  <p className="break-words text-sm font-semibold text-gray-900">
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
    </DashboardLayout>
  )
}

export default TeacherTaskDetailsPage