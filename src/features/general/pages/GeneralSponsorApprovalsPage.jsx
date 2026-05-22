import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalSponsorNavigation } from '../config/generalNavigation'

function GeneralSponsorApprovalsPage() {
  const [requests, setRequests] = useState([])
  const [commentMap, setCommentMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState('')
  const [submissionsMap, setSubmissionsMap] = useState({})

  useEffect(() => {
    fetchApprovalRequests()
  }, [])

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

  async function fetchApprovalRequests() {
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
      'get_general_sponsor_task_approvals',
      {
        sponsor_uuid: user.id,
      }
    )

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setRequests(data || [])

    await fetchTaskSubmissions((data || []).map((request) => request.task_id))

    setLoading(false)
  }

  function handleCommentChange(taskId, value) {
    setCommentMap({
      ...commentMap,
      [taskId]: value,
    })
  }

  async function handleDecision(request, decision) {
    setUpdating(true)
    setMessage('')

    const comment = commentMap[request.task_id] || ''

    if (decision === 'revision_requested' && !comment.trim()) {
      setMessage('Please add a revision comment before requesting revision.')
      setUpdating(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('User not found.')
      setUpdating(false)
      return
    }

    const updateData = {
      sponsor_approval_status: decision,
      sponsor_approval_decided_at: new Date().toISOString(),
      sponsor_approval_decided_by: user.id,
      sponsor_approval_comment: comment || null,
    }

    if (decision === 'revision_requested') {
      updateData.status = 'revision_requested'
    }

    const { error } = await supabase
      .from('general_tasks')
      .update(updateData)
      .eq('id', request.task_id)

    if (error) {
      setMessage(error.message)
      setUpdating(false)
      return
    }

    await supabase.from('general_activity_logs').insert({
      project_id: request.project_id,
      task_id: request.task_id,
      user_id: user.id,
      activity_type:
        decision === 'approved'
          ? 'sponsor_approved_task'
          : 'sponsor_requested_task_revision',
      description:
        decision === 'approved'
          ? `Sponsor approved task "${request.task_title}".`
          : `Sponsor requested revision for task "${request.task_title}": ${comment}`,
    })

    setCommentMap({
      ...commentMap,
      [request.task_id]: '',
    })

    setUpdating(false)
    await fetchApprovalRequests()
  }

  return (
    <DashboardLayout
      title="General Workplace"
      pageTitle="Approvals"
      navigation={generalSponsorNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Task Approvals
          </h1>

          <p className="mt-2 text-gray-500">
            Review optional task approval requests sent by project managers.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading approval requests...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card
                title="Pending Requests"
                value={requests.length}
                description="Tasks waiting for review"
              />

              <Card
                title="Approval Type"
                value="Optional"
                description="Requested only when manager needs sponsor approval"
              />

              <Card
                title="Revision Comments"
                value="Required"
                description="Sponsors must comment when requesting revision"
              />
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Pending Task Approval Requests"
                description="Approve completed tasks or request revision with comments."
              />

              {requests.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                  No pending task approval requests.
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => {
                    const assignedName = `${request.assigned_first_name || ''} ${
                      request.assigned_last_name || ''
                    }`.trim()

                    const managerName = `${request.manager_first_name || ''} ${
                      request.manager_last_name || ''
                    }`.trim()

                    return (
                      <div
                        key={request.task_id}
                        className="rounded-3xl border border-[#D6E4FF] bg-[#EAF2FF] p-5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#00B8B0]">
                              {request.project_title}
                            </p>

                            <h3 className="mt-1 text-2xl font-black text-gray-900">
                              {request.task_title}
                            </h3>

                            <p className="mt-2 text-gray-700">
                              {request.task_description || 'No description.'}
                            </p>
                          </div>

                          <span className="rounded-full border border-[#00CFC8]/30 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0] shadow-sm">
                            {request.sponsor_approval_status}
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
                          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                            <p className="text-gray-500">Assigned Member</p>
                            <p className="font-bold text-gray-900">
                              {assignedName ||
                                request.assigned_email ||
                                'Unassigned'}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                            <p className="text-gray-500">Project Manager</p>
                            <p className="font-bold text-gray-900">
                              {managerName ||
                                request.manager_email ||
                                'Unknown'}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                            <p className="text-gray-500">Priority</p>
                            <p className="font-bold capitalize text-gray-900">
                              {request.priority}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                            <p className="text-gray-500">Due Date</p>
                            <p className="font-bold text-gray-900">
                              {request.due_date
                                ? new Date(request.due_date).toLocaleDateString()
                                : 'None'}
                            </p>
                          </div>
                        </div>

                        {(submissionsMap[request.task_id] || []).length > 0 && (
                          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="mb-3 font-black text-[#00CFC8]">
                              Submitted Work
                            </p>

                            <div className="space-y-3">
                              {(submissionsMap[request.task_id] || []).map(
                                (submission) => (
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
                                        {submission.file_name ||
                                          'Open uploaded file'}
                                      </a>
                                    )}

                                    <p className="mt-2 text-xs text-gray-400">
                                      {new Date(
                                        submission.created_at
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-5">
                          <textarea
                            value={commentMap[request.task_id] || ''}
                            onChange={(e) =>
                              handleCommentChange(
                                request.task_id,
                                e.target.value
                              )
                            }
                            placeholder="Add approval note or revision comment..."
                            className="min-h-24 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            disabled={updating}
                            onClick={() => handleDecision(request, 'approved')}
                            className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                          >
                            Approve Task
                          </button>

                          <button
                            disabled={updating}
                            onClick={() =>
                              handleDecision(request, 'revision_requested')
                            }
                            className="rounded-xl border border-[#00CFC8]/40 bg-white px-5 py-3 font-semibold text-[#00B8B0] transition-all hover:bg-gray-50 disabled:opacity-50"
                          >
                            Request Revision
                          </button>

                          <Link
                            to={`/general/sponsor/projects/${request.project_id}`}
                            className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50"
                          >
                            View Project
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default GeneralSponsorApprovalsPage