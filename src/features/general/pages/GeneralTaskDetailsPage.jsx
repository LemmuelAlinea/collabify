import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import {
  generalManagerNavigation,
  generalMemberNavigation,
  generalSponsorNavigation,
} from '../config/generalNavigation'

function GeneralTaskDetailsPage({ roleType }) {
  const { projectId, taskId } = useParams()

  const [task, setTask] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [activities, setActivities] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [submissionText, setSubmissionText] = useState('')
  const [revisionComment, setRevisionComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deletingSubmissionId, setDeletingSubmissionId] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchTaskDetails()
  }, [projectId, taskId])

  function getNavigation() {
    if (roleType === 'manager') return generalManagerNavigation
    if (roleType === 'sponsor') return generalSponsorNavigation
    return generalMemberNavigation
  }

  function getBackLink() {
    if (roleType === 'manager') return `/general/manager/projects/${projectId}`
    if (roleType === 'sponsor') return `/general/sponsor/projects/${projectId}`
    return `/general/member/projects/${projectId}`
  }

  function addActivity(description, activityType = 'task_updated') {
    const optimisticActivity = {
      id: `temp-${Date.now()}`,
      task_id: taskId,
      project_id: projectId,
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

    const foundTask = (taskRows || []).find((item) => item.id === taskId)

    if (!foundTask) {
      setMessage('Task not found.')
      setLoading(false)
      return
    }

    const { data: submissionRows } = await supabase
      .from('general_task_submissions')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    const { data: activityRows } = await supabase
      .from('general_activity_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    setTask(foundTask)
    setSubmissions(submissionRows || [])
    setActivities(activityRows || [])
    setLoading(false)
  }

  async function handleDeleteSubmission(submission) {
    setMessage('')

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this submission?'
    )

    if (!confirmDelete) return

    setDeletingSubmissionId(submission.id)

    const previousSubmissions = submissions

    setSubmissions((current) =>
      current.filter((item) => item.id !== submission.id)
    )

    if (submission.submission_type === 'file' && submission.file_path) {
      const { error: storageError } = await supabase.storage
        .from('general-task-submissions')
        .remove([submission.file_path])

      if (storageError) {
        setSubmissions(previousSubmissions)
        setMessage(storageError.message)
        setDeletingSubmissionId(null)
        return
      }
    }

    const { error } = await supabase
      .from('general_task_submissions')
      .delete()
      .eq('id', submission.id)

    if (error) {
      setSubmissions(previousSubmissions)
      setMessage(error.message)
      setDeletingSubmissionId(null)
      return
    }

    setMessage('Submission deleted successfully.')
    setDeletingSubmissionId(null)
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
      .from('general_tasks')
      .update({ status: 'in_progress' })
      .eq('id', task.id)

    if (error) {
      setTask(previousTask)
      setMessage(error.message)
      setActionLoading(false)
      return
    }

    await supabase.from('general_activity_logs').insert({
      project_id: projectId,
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_started',
      description: `Task "${task.title}" was started.`,
    })

    addActivity(`Task "${task.title}" was started.`, 'task_started')
    setActionLoading(false)
  }

  async function handleCompleteTask() {
    setMessage('')
    setActionLoading(true)

    const previousTask = task

    setTask((current) => ({
      ...current,
      status: 'completed',
      sponsor_approval_status: null,
      sponsor_approval_comment: null,
      sponsor_approval_requested_at: null,
      sponsor_approval_requested_by: null,
      sponsor_approval_decided_at: null,
      sponsor_approval_decided_by: null,
    }))

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

    if (error) {
      setTask(previousTask)
      setMessage(error.message)
      setActionLoading(false)
      return
    }

    await supabase.from('general_activity_logs').insert({
      project_id: projectId,
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_completed',
      description: `Task "${task.title}" was completed.`,
    })

    addActivity(`Task "${task.title}" was completed.`, 'task_completed')
    setActionLoading(false)
  }

  async function handleAddTextSubmission() {
    setMessage('')

    const content = submissionText.trim()

    if (!content) {
      setMessage('Please enter text before submitting.')
      return
    }

    const optimisticSubmission = {
      id: `temp-${Date.now()}`,
      task_id: task.id,
      project_id: projectId,
      member_id: currentUser.id,
      submission_type: 'text',
      content,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    }

    setSubmissionText('')
    setSubmissions((current) => [optimisticSubmission, ...current])

    const { data, error } = await supabase
      .from('general_task_submissions')
      .insert({
        task_id: task.id,
        project_id: projectId,
        member_id: currentUser.id,
        submission_type: 'text',
        content,
      })
      .select()
      .single()

    if (error) {
      setSubmissions((current) =>
        current.filter((item) => item.id !== optimisticSubmission.id)
      )
      setSubmissionText(content)
      setMessage(error.message)
      return
    }

    setSubmissions((current) =>
      current.map((item) =>
        item.id === optimisticSubmission.id ? data : item
      )
    )

    await supabase.from('general_activity_logs').insert({
      project_id: projectId,
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_text_submitted',
      description: `Text work was added to task "${task.title}".`,
    })

    addActivity(
      `Text work was added to task "${task.title}".`,
      'task_text_submitted'
    )
  }

  async function handleUploadFile(file) {
    setMessage('')

    if (!file) return

    setUploading(true)

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${projectId}/${task.id}/${Date.now()}-${safeFileName}`

    const { error: uploadError } = await supabase.storage
      .from('general-task-submissions')
      .upload(filePath, file)

    if (uploadError) {
      setMessage(uploadError.message)
      setUploading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('general-task-submissions')
      .getPublicUrl(filePath)

    const optimisticSubmission = {
      id: `temp-file-${Date.now()}`,
      task_id: task.id,
      project_id: projectId,
      member_id: currentUser.id,
      submission_type: 'file',
      file_name: file.name,
      file_path: filePath,
      file_url: publicUrlData.publicUrl,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    }

    setSubmissions((current) => [optimisticSubmission, ...current])

    const { data, error } = await supabase
      .from('general_task_submissions')
      .insert({
        task_id: task.id,
        project_id: projectId,
        member_id: currentUser.id,
        submission_type: 'file',
        file_name: file.name,
        file_path: filePath,
        file_url: publicUrlData.publicUrl,
      })
      .select()
      .single()

    if (error) {
      setSubmissions((current) =>
        current.filter((item) => item.id !== optimisticSubmission.id)
      )

      await supabase.storage
        .from('general-task-submissions')
        .remove([filePath])

      setMessage(error.message)
      setUploading(false)
      return
    }

    setSubmissions((current) =>
      current.map((item) =>
        item.id === optimisticSubmission.id ? data : item
      )
    )

    await supabase.from('general_activity_logs').insert({
      project_id: projectId,
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_file_uploaded',
      description: `File "${file.name}" was uploaded for task "${task.title}".`,
    })

    addActivity(
      `File "${file.name}" was uploaded for task "${task.title}".`,
      'task_file_uploaded'
    )

    setUploading(false)
  }

  async function handleRequestSponsorApproval() {
    setMessage('')
    setActionLoading(true)

    const previousTask = task

    setTask((current) => ({
      ...current,
      sponsor_approval_required: true,
      sponsor_approval_status: 'pending',
      sponsor_approval_requested_at: new Date().toISOString(),
      sponsor_approval_requested_by: currentUser.id,
      sponsor_approval_comment: null,
    }))

    const { error } = await supabase
      .from('general_tasks')
      .update({
        sponsor_approval_required: true,
        sponsor_approval_status: 'pending',
        sponsor_approval_requested_at: new Date().toISOString(),
        sponsor_approval_requested_by: currentUser.id,
        sponsor_approval_comment: null,
      })
      .eq('id', task.id)

    if (error) {
      setTask(previousTask)
      setMessage(error.message)
      setActionLoading(false)
      return
    }

    addActivity(
      `Task "${task.title}" was sent to the sponsor for approval.`,
      'sponsor_task_approval_requested'
    )

    setActionLoading(false)
  }

  async function handleSponsorDecision(decision) {
    setMessage('')

    if (decision === 'revision_requested' && !revisionComment.trim()) {
      setMessage('Please add a revision comment.')
      return
    }

    setActionLoading(true)

    const previousTask = task
    const comment = revisionComment.trim()

    const updateData = {
      sponsor_approval_status: decision,
      sponsor_approval_decided_at: new Date().toISOString(),
      sponsor_approval_decided_by: currentUser.id,
      sponsor_approval_comment: comment || null,
    }

    if (decision === 'revision_requested') {
      updateData.status = 'revision_requested'
    }

    setTask((current) => ({
      ...current,
      ...updateData,
    }))

    const { error } = await supabase
      .from('general_tasks')
      .update(updateData)
      .eq('id', task.id)

    if (error) {
      setTask(previousTask)
      setMessage(error.message)
      setActionLoading(false)
      return
    }

    setRevisionComment('')

    addActivity(
      decision === 'approved'
        ? `Sponsor approved task "${task.title}".`
        : `Sponsor requested revision for task "${task.title}": ${comment}`,
      decision === 'approved'
        ? 'sponsor_approved_task'
        : 'sponsor_requested_task_revision'
    )

    setActionLoading(false)
  }

  function renderSubmission(submission) {
    if (submission.submission_type === 'text') {
      return (
        <p className="max-w-full overflow-hidden break-all whitespace-pre-wrap text-gray-700">
          {submission.content}
        </p>
      )
    }

    const fileName = submission.file_name || ''
    const fileUrl = submission.file_url || ''

    if (fileName.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
      return (
        <img
          src={fileUrl}
          alt={fileName}
          className="mt-3 max-h-[420px] w-full rounded-2xl border border-gray-200 object-contain"
        />
      )
    }

    if (fileName.match(/\.pdf$/i)) {
      return (
        <iframe
          src={fileUrl}
          title={fileName}
          className="mt-3 h-[600px] w-full rounded-2xl border border-gray-200"
        />
      )
    }

    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="break-all font-semibold text-[#00B8B0] hover:underline"
      >
        Open {fileName || 'uploaded file'}
      </a>
    )
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Collabify"
        pageTitle="Task Details"
        navigation={getNavigation()}
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
        navigation={getNavigation()}
      >
        <p className="text-gray-500">{message || 'Task not found.'}</p>
      </DashboardLayout>
    )
  }

  const assignedName = task.assigned_to
    ? `${task.assigned_first_name || ''} ${
        task.assigned_last_name || ''
      }`.trim() ||
      task.assigned_email ||
      'Assigned member'
    : 'Unassigned'

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Task Details"
      navigation={getNavigation()}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <Link
            to={getBackLink()}
            className="text-sm font-semibold text-[#00B8B0] hover:underline"
          >
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
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Card
            title="Status"
            value={task.status}
            description="Current task state"
          />

          <Card
            title="Assigned To"
            value={assignedName}
            description="Assigned member"
          />

          <Card
            title="Priority"
            value={task.priority}
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

        {task.sponsor_approval_status && (
          <div
            className={`rounded-3xl border p-5 shadow-sm ${
              task.sponsor_approval_status === 'revision_requested'
                ? 'border-yellow-300 bg-yellow-50'
                : task.sponsor_approval_status === 'approved'
                  ? 'border-green-300 bg-green-50'
                  : 'border-cyan-300 bg-cyan-50'
            }`}
          >
            <p className="font-black text-gray-900">
              Sponsor Approval: {task.sponsor_approval_status}
            </p>

            {task.sponsor_approval_comment && (
              <p className="mt-2 break-words text-gray-700">
                {task.sponsor_approval_comment}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm xl:col-span-2">
            <SectionHeader
              title="Submitted Work"
              description="Files, text, images, PDFs, and other work submitted for this task."
            />

            {submissions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                No submitted work yet.
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className={`min-w-0 overflow-hidden rounded-2xl border border-[#D6E4FF] bg-[#EAF2FF] p-4 shadow-sm ${
                      submission.isOptimistic ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        {renderSubmission(submission)}

                        <p className="mt-3 text-xs text-gray-400">
                          {new Date(submission.created_at).toLocaleString()}
                        </p>
                      </div>

                      {roleType === 'member' && (
                        <button
                          type="button"
                          disabled={deletingSubmissionId === submission.id}
                          onClick={() => handleDeleteSubmission(submission)}
                          className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:flex-shrink-0"
                        >
                          {deletingSubmissionId === submission.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {roleType === 'member' &&
              (task.status === 'in_progress' ||
                task.status === 'revision_requested') && (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
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
                      onClick={handleAddTextSubmission}
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
              description="Available controls for your role."
            />

            <div className="space-y-3">
              {roleType === 'member' && task.status === 'todo' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleStartTask}
                  className="h-11 w-full rounded-xl border border-[#00CFC8]/40 bg-white font-semibold text-[#00B8B0] transition-all hover:bg-gray-50 disabled:opacity-50"
                >
                  {actionLoading ? 'Starting...' : 'Start Task'}
                </button>
              )}

              {roleType === 'member' && task.status !== 'completed' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCompleteTask}
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Mark Completed'}
                </button>
              )}

              {roleType === 'manager' &&
                task.status === 'completed' &&
                task.sponsor_approval_status !== 'pending' &&
                task.sponsor_approval_status !== 'approved' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleRequestSponsorApproval}
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {actionLoading
                      ? 'Sending...'
                      : 'Request Sponsor Approval'}
                  </button>
                )}

              {roleType === 'sponsor' &&
                task.sponsor_approval_status === 'pending' && (
                  <>
                    <textarea
                      value={revisionComment}
                      onChange={(e) => setRevisionComment(e.target.value)}
                      placeholder="Add approval note or revision comment..."
                      className="min-h-24 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleSponsorDecision('approved')}
                      className="h-11 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                    >
                      {actionLoading ? 'Approving...' : 'Approve Task'}
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        handleSponsorDecision('revision_requested')
                      }
                      className="h-11 w-full rounded-xl border border-[#00CFC8]/40 bg-white font-semibold text-[#00B8B0] transition-all hover:bg-gray-50 disabled:opacity-50"
                    >
                      {actionLoading
                        ? 'Sending...'
                        : 'Request Revision'}
                    </button>
                  </>
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

export default GeneralTaskDetailsPage