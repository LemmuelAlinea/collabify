import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { studentNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'

function StudentTaskDetailsPage() {
  const { taskId } = useParams()

  const [task, setTask] = useState(null)
  const [versions, setVersions] = useState([])
  const [activities, setActivities] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [submissionText, setSubmissionText] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [deletingVersionId, setDeletingVersionId] = useState(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchTaskDetails()
  }, [taskId])

  function getBackLink() {
    if (task?.project_id) return `/student/projects/${task.project_id}`
    return '/student/tasks'
  }

  function getNextVersionNumber() {
    if (versions.length === 0) return 1

    return (
      Math.max(
        ...versions.map((version) => Number(version.version_number || 0))
      ) + 1
    )
  }

  function addActivity(description, activityType = 'task_updated') {
    const optimisticActivity = {
      // eslint-disable-next-line react-hooks/purity
      id: `temp-${Date.now()}`,
      task_id: taskId,
      activity_type: activityType,
      description,
      created_at: new Date().toISOString(),
    }

    setActivities((current) => [optimisticActivity, ...current])
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
          class_id
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
      .select('*')
      .eq('task_id', taskId)
      .order('version_number', { ascending: false })

    const { data: activityRows } = await supabase
      .from('task_activity_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    setTask(taskData)
    setVersions(versionRows || [])
    setActivities(activityRows || [])
    setLoading(false)
  }

  async function handleStartTask() {
    setMessage('')
    setActionLoading(true)

    const previousTask = task

    setTask((current) => ({
      ...current,
      status: 'in_progress',
    }))

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'in_progress' })
      .eq('id', task.id)
      .eq('assigned_to', currentUser.id)

    if (error) {
      setTask(previousTask)
      setMessage(error.message)
      setActionLoading(false)
      return
    }

    await supabase.from('task_activity_logs').insert({
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_started',
      description: `Task "${task.title}" was started.`,
    })

    addActivity(`Task "${task.title}" was started.`, 'task_started')
    setActionLoading(false)
  }

  async function handleAddTextWork() {
    setMessage('')

    const content = submissionText.trim()

    if (!content) {
      setMessage('Please enter text before submitting.')
      return
    }

    const nextVersionNumber = getNextVersionNumber()

    const optimisticVersion = {
      // eslint-disable-next-line react-hooks/purity
      id: `temp-text-${Date.now()}`,
      task_id: task.id,
      uploaded_by: currentUser.id,
      file_name: 'Text Work',
      file_type: 'text',
      text_content: content,
      version_number: nextVersionNumber,
      is_final: false,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    }

    setSubmissionText('')
    setVersions((current) => [optimisticVersion, ...current])

    const { data, error } = await supabase
      .from('task_versions')
      .insert({
        task_id: task.id,
        uploaded_by: currentUser.id,
        file_name: 'Text Work',
        file_type: 'text',
        text_content: content,
        version_number: nextVersionNumber,
        is_final: false,
      })
      .select()
      .single()

    if (error) {
      setVersions((current) =>
        current.filter((item) => item.id !== optimisticVersion.id)
      )
      setSubmissionText(content)
      setMessage(error.message)
      return
    }

    setVersions((current) =>
      current.map((item) => (item.id === optimisticVersion.id ? data : item))
    )

    await supabase.from('task_activity_logs').insert({
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'text_work_added',
      description: `Text work was added to task "${task.title}".`,
    })

    addActivity(`Text work was added to task "${task.title}".`, 'text_work_added')
  }

  async function handleUploadFile(file) {
    setMessage('')

    if (!file) return

    setUploading(true)

    const nextVersionNumber = getNextVersionNumber()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    // eslint-disable-next-line react-hooks/purity
    const filePath = `${currentUser.id}/${task.id}/${Date.now()}-${safeFileName}`

    const { error: uploadError } = await supabase.storage
      .from('task-files')
      .upload(filePath, file)

    if (uploadError) {
      setMessage(uploadError.message)
      setUploading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('task-files')
      .getPublicUrl(filePath)

    const optimisticVersion = {
      // eslint-disable-next-line react-hooks/purity
      id: `temp-file-${Date.now()}`,
      task_id: task.id,
      uploaded_by: currentUser.id,
      file_name: file.name,
      file_path: filePath,
      file_url: publicUrlData.publicUrl,
      file_type: file.type || 'file',
      file_size: file.size,
      version_number: nextVersionNumber,
      is_final: false,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    }

    setVersions((current) => [optimisticVersion, ...current])

    const { data, error } = await supabase
      .from('task_versions')
      .insert({
        task_id: task.id,
        uploaded_by: currentUser.id,
        file_name: file.name,
        file_path: filePath,
        file_url: publicUrlData.publicUrl,
        file_type: file.type || 'file',
        file_size: file.size,
        version_number: nextVersionNumber,
        is_final: false,
      })
      .select()
      .single()

    if (error) {
      setVersions((current) =>
        current.filter((item) => item.id !== optimisticVersion.id)
      )

      await supabase.storage.from('task-files').remove([filePath])

      setMessage(error.message)
      setUploading(false)
      return
    }

    setVersions((current) =>
      current.map((item) => (item.id === optimisticVersion.id ? data : item))
    )

    await supabase.from('task_activity_logs').insert({
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'file_uploaded',
      description: `File "${file.name}" was uploaded for task "${task.title}".`,
    })

    addActivity(
      `File "${file.name}" was uploaded for task "${task.title}".`,
      'file_uploaded'
    )

    setUploading(false)
  }

  async function handleSetFinalVersion(versionId) {
    setMessage('')

    const previousVersions = versions

    setVersions((current) =>
      current.map((version) => ({
        ...version,
        is_final: version.id === versionId,
      }))
    )

    await supabase
      .from('task_versions')
      .update({ is_final: false })
      .eq('task_id', task.id)

    const { error } = await supabase
      .from('task_versions')
      .update({ is_final: true })
      .eq('id', versionId)

    if (error) {
      setVersions(previousVersions)
      setMessage(error.message)
      return
    }

    await supabase.from('task_activity_logs').insert({
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'final_version_selected',
      description: `A final version was selected for task "${task.title}".`,
    })

    addActivity(
      `A final version was selected for task "${task.title}".`,
      'final_version_selected'
    )
  }

  async function handleDeleteVersion(version) {
    setMessage('')

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this work version?'
    )

    if (!confirmDelete) return

    setDeletingVersionId(version.id)

    const previousVersions = versions

    setVersions((current) => current.filter((item) => item.id !== version.id))

    if (version.file_path) {
      const { error: storageError } = await supabase.storage
        .from('task-files')
        .remove([version.file_path])

      if (storageError) {
        setVersions(previousVersions)
        setMessage(storageError.message)
        setDeletingVersionId(null)
        return
      }
    }

    const { error } = await supabase
      .from('task_versions')
      .delete()
      .eq('id', version.id)

    if (error) {
      setVersions(previousVersions)
      setMessage(error.message)
      setDeletingVersionId(null)
      return
    }

    setMessage('Work version deleted successfully.')
    setDeletingVersionId(null)
  }

  async function handleSubmitTask() {
    setMessage('')
    setActionLoading(true)

    const finalVersion = versions.find((version) => version.is_final)

    if (!finalVersion) {
      setMessage('Please select a final version before submitting.')
      setActionLoading(false)
      return
    }

    const previousTask = task

    setTask((current) => ({
      ...current,
      status: 'submitted',
    }))

    const { error: submissionError } = await supabase
      .from('task_submissions')
      .insert({
        task_id: task.id,
        submitted_by: currentUser.id,
        final_version_id: finalVersion.id,
      })

    if (submissionError && submissionError.code !== '23505') {
      setTask(previousTask)
      setMessage(submissionError.message)
      setActionLoading(false)
      return
    }

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'submitted' })
      .eq('id', task.id)
      .eq('assigned_to', currentUser.id)

    if (error) {
      setTask(previousTask)
      setMessage(error.message)
      setActionLoading(false)
      return
    }

    await supabase.from('task_activity_logs').insert({
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_submitted',
      description: `Task "${task.title}" was submitted.`,
    })

    addActivity(`Task "${task.title}" was submitted.`, 'task_submitted')
    setActionLoading(false)
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

  const canEditTask =
    task?.assigned_to === currentUser?.id &&
    task?.status !== 'submitted' &&
    task?.status !== 'completed'

  const canAddWork =
    canEditTask &&
    (task?.status === 'claimed' ||
      task?.status === 'in_progress' ||
      task?.status === 'revision_requested')

  if (loading) {
    return (
      <DashboardLayout
        title="Student Panel"
        pageTitle="Task Details"
        navigation={studentNavigation}
      >
        <p className="text-gray-500">Loading task details...</p>
      </DashboardLayout>
    )
  }

  if (!task) {
    return (
      <DashboardLayout
        title="Student Panel"
        pageTitle="Task Details"
        navigation={studentNavigation}
      >
        <p className="text-gray-500">{message || 'Task not found.'}</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Student Panel"
      pageTitle="Task Details"
      navigation={studentNavigation}
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
            title="Project"
            value={task.projects?.title || 'N/A'}
            description="Source project"
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
              description="Files, text, images, PDFs, and other work uploaded for this task."
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
                    className={`min-w-0 overflow-hidden rounded-2xl border border-[#D6E4FF] bg-[#EAF2FF] p-4 shadow-sm ${
                      version.isOptimistic ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="font-black text-gray-900">
                          Version {version.version_number || '?'}{' '}
                          {version.is_final ? '— Final' : ''}
                        </p>

                        <p className="mt-1 break-all text-sm text-gray-500">
                          {version.file_name || 'Text Work'}
                        </p>

                        <div className="mt-3">{renderVersion(version)}</div>

                        <p className="mt-3 text-xs text-gray-400">
                          {new Date(version.created_at).toLocaleString()}
                        </p>
                      </div>

                      {canEditTask && (
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-shrink-0">
                          {!version.is_final && (
                            <button
                              type="button"
                              onClick={() => handleSetFinalVersion(version.id)}
                              className="rounded-xl border border-[#00CFC8]/40 bg-white px-3 py-2 text-xs font-bold text-[#00B8B0] transition-all hover:bg-gray-50"
                            >
                              Set Final
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={deletingVersionId === version.id}
                            onClick={() => handleDeleteVersion(version)}
                            className="rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingVersionId === version.id
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canAddWork && (
              <div className="mt-6 rounded-2xl border border-gray-300 bg-white p-4 shadow-sm">
                <p className="mb-3 font-black text-[#00CFC8]">
                  Add Work Submission
                </p>

                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Write notes, links, explanation, or your work details..."
                  className="min-h-24 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                />

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={handleAddTextWork}
                    className="h-11 rounded-xl border border-[#00CFC8]/40 bg-white px-5 font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                  >
                    Add Text Work
                  </button>

                  <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 font-black text-black transition-all hover:opacity-90">
                    {uploading ? 'Uploading...' : 'Upload File'}

                    <input
                      type="file"
                      className="hidden"
                      disabled={uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        await handleUploadFile(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Actions"
              description="Available controls for this task."
            />

            <div className="space-y-3">
              {task.status === 'claimed' && task.assigned_to === currentUser?.id && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleStartTask}
                  className="h-11 w-full rounded-xl border border-[#00CFC8]/40 bg-white font-semibold text-[#00B8B0] transition-all hover:bg-gray-50 disabled:opacity-50"
                >
                  {actionLoading ? 'Starting...' : 'Start Task'}
                </button>
              )}

              {canEditTask && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleSubmitTask}
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Task'}
                </button>
              )}

              {(task.status === 'submitted' || task.status === 'completed') && (
                <div className="rounded-2xl border border-green-300 bg-green-50 p-4 text-sm font-black text-green-700">
                  Task already submitted.
                </div>
              )}

              {task.assigned_to !== currentUser?.id && (
                <div className="rounded-2xl border border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                  This task is not assigned to you.
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

export default StudentTaskDetailsPage