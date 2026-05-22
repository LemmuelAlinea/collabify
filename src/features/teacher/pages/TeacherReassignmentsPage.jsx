import { useEffect, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import { Bot } from 'lucide-react'
import { isAIEnabled, logAIUsage } from '../../../lib/aiSystem'

function TeacherReassignmentsPage() {
  const [pendingRequests, setPendingRequests] = useState([])
  const [recentDecisions, setRecentDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [aiLoadingId, setAiLoadingId] = useState('')
  const [aiDecisions, setAiDecisions] = useState({})

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchRequests()
  }, [])

  async function fetchRequests() {
    setLoading(true)
    setMessage('')

    const { data: requests, error } = await supabase.rpc(
      'get_teacher_reassignment_requests'
    )

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const formattedRequests = (requests || []).map((request) => ({
      ...request,
      requester: {
        name: `${request.requester_first_name || ''} ${
          request.requester_last_name || ''
        }`.trim(),
        email: request.requester_email || '',
      },
      target: {
        name: `${request.target_first_name || ''} ${
          request.target_last_name || ''
        }`.trim(),
        email: request.target_email || '',
      },
      task: {
        title: request.task_title,
        status: request.task_status,
      },
      project: {
        title: request.project_title,
      },
      group: {
        group_name: request.group_name,
      },
      classInfo: {
        class_name: request.class_name,
        section: request.section,
      },
    }))

    setPendingRequests(
      formattedRequests.filter((request) => request.status === 'pending')
    )

    setRecentDecisions(
      formattedRequests
        .filter((request) => request.status !== 'pending')
        .slice(0, 5)
    )

    setLoading(false)
  }
async function handleAiDecision(request) {
  setMessage('')
  setAiLoadingId(request.id)

  const aiEnabled = await isAIEnabled()

  if (!aiEnabled) {
    setMessage('AI features are currently disabled by the platform admin.')
    setAiLoadingId('')
    return
  }

  const webhookUrl = import.meta.env.VITE_N8N_REASSIGNMENT_AI_WEBHOOK_URL

  if (!webhookUrl) {
    setMessage('Missing VITE_N8N_REASSIGNMENT_AI_WEBHOOK_URL in .env file.')
    setAiLoadingId('')
    return
  }

  const { data: groupTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('group_id', request.group_id)
    .eq('project_id', request.project_id)

  const { data: taskActivity } = await supabase
    .from('task_activity_logs')
    .select('*')
    .eq('task_id', request.task_id)
    .order('created_at', { ascending: true })

  const currentOwnerTasks = (groupTasks || []).filter(
    (task) => task.assigned_to === request.requested_by
  )

  const targetMemberTasks = (groupTasks || []).filter(
    (task) => task.assigned_to === request.requested_to
  )

  const selectedTask = (groupTasks || []).find(
    (task) => task.id === request.task_id
  )

  const taskCreatedAt = selectedTask?.created_at || request.created_at
  const requestedAt = request.created_at

  const daysBeforeRequest = Math.max(
    0,
    Math.round(
      (new Date(requestedAt).getTime() - new Date(taskCreatedAt).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  )

  const payload = {
    request_id: request.id,
    project_id: request.project_id,
    group_id: request.group_id,
    task_id: request.task_id,

    task: {
      title: request.task?.title,
      status: request.task?.status,
      created_at: taskCreatedAt,
      due_date: selectedTask?.due_date || null,
      priority: selectedTask?.priority || null,
      difficulty: selectedTask?.difficulty || null,
      days_before_request: daysBeforeRequest,
    },

    requester: {
      id: request.requested_by,
      name: request.requester.name,
      email: request.requester.email,
      active_tasks: currentOwnerTasks.filter(
        (task) =>
          task.status !== 'submitted' &&
          task.status !== 'completed'
      ).length,
      submitted_tasks: currentOwnerTasks.filter(
        (task) =>
          task.status === 'submitted' ||
          task.status === 'completed'
      ).length,
      total_tasks: currentOwnerTasks.length,
    },

    target: {
      id: request.requested_to,
      name: request.target.name,
      email: request.target.email,
      active_tasks: targetMemberTasks.filter(
        (task) =>
          task.status !== 'submitted' &&
          task.status !== 'completed'
      ).length,
      submitted_tasks: targetMemberTasks.filter(
        (task) =>
          task.status === 'submitted' ||
          task.status === 'completed'
      ).length,
      total_tasks: targetMemberTasks.length,
    },

    group_summary: {
      total_tasks: (groupTasks || []).length,
      unclaimed_tasks: (groupTasks || []).filter(
        (task) => !task.assigned_to
      ).length,
      active_tasks: (groupTasks || []).filter(
        (task) =>
          task.status !== 'submitted' &&
          task.status !== 'completed'
      ).length,
      completed_tasks: (groupTasks || []).filter(
        (task) =>
          task.status === 'submitted' ||
          task.status === 'completed'
      ).length,
    },

    request: {
      reason: request.reason,
      requested_at: request.created_at,
    },

    task_activity: taskActivity || [],
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      await logAIUsage({
        featureName: 'teacher_reassignment_ai_decision',
        workspace: 'educational',
        status: 'failed',
        metadata: {
          request_id: request.id,
          error: 'n8n request failed',
        },
      })

      setMessage('AI reassignment decision failed.')
      setAiLoadingId('')
      return
    }

    const result = await response.json()

    setAiDecisions((current) => ({
      ...current,
      [request.id]: {
        decision: result.decision || 'needs_review',
        confidence: result.confidence || 'medium',
        reason: result.reason || 'No explanation provided.',
        criteria: result.criteria || [],
      },
    }))

    await logAIUsage({
      featureName: 'teacher_reassignment_ai_decision',
      workspace: 'educational',
      status: 'success',
      metadata: {
        request_id: request.id,
        ai_decision: result.decision || 'needs_review',
        confidence: result.confidence || 'medium',
      },
    })
  } catch (error) {
    console.error(error)

    await logAIUsage({
      featureName: 'teacher_reassignment_ai_decision',
      workspace: 'educational',
      status: 'failed',
      metadata: {
        request_id: request.id,
        error: error.message,
      },
    })

    setMessage('Unexpected error while asking AI.')
  }

  setAiLoadingId('')
}
  async function handleDecision(request, decision) {
    const confirmMessage =
      decision === 'approved'
        ? 'Are you sure you want to approve this reassignment?'
        : 'Are you sure you want to reject this reassignment?'

    const confirmed = window.confirm(confirmMessage)

    if (!confirmed) return

    setMessage('')

    if (decision === 'approved') {
      const { error } = await supabase.rpc('approve_task_reassignment', {
        request_uuid: request.id,
      })

      if (error) {
        setMessage(error.message)
        return
      }
    }

    if (decision === 'rejected') {
      const { error } = await supabase
        .from('task_reassignment_requests')
        .update({
          status: 'rejected',
          decided_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (error) {
        setMessage(error.message)
        return
      }

      await supabase.from('task_activity_logs').insert({
        task_id: request.task_id,
        user_id: request.teacher_id,
        activity_type: 'reassignment_rejected',
        description: 'Teacher rejected a task reassignment request.',
      })
    }

    await fetchRequests()
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Reassignments"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Reassignments
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            Review task reassignment requests from your students.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card
            title="Pending"
            value={pendingRequests.length}
            description="Requests waiting"
          />

          <Card
            title="Recent Decisions"
            value={recentDecisions.length}
            description="Latest reviewed"
          />

          <Card
            title="Total Visible"
            value={pendingRequests.length + recentDecisions.length}
            description="Loaded requests"
          />
        </div>

        <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-black">
              Pending Reassignment Requests
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Approve or reject student task reassignment requests.
            </p>
          </div>

          {loading ? (
            <p className="mt-5 text-gray-500">Loading requests...</p>
          ) : pendingRequests.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
              No pending reassignment requests.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <h3 className="break-words text-2xl font-black text-gray-900">
                        {request.task?.title || 'Untitled Task'}
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        {request.project?.title || 'Unknown Project'}
                      </p>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                          <p className="text-xs text-gray-500">Section</p>

                          <p className="mt-1 font-bold text-gray-900">
                            {request.classInfo?.section || 'N/A'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                          <p className="text-xs text-gray-500">Group</p>

                          <p className="mt-1 font-bold text-gray-900">
                            {request.group?.group_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-3 text-sm xl:min-w-[260px]">
                      <p className="text-gray-500">Requested Date</p>

                      <p className="mt-1 font-bold text-gray-900">
                        {new Date(request.created_at).toLocaleString()}
                      </p>

                      <p className="mt-3 text-gray-500">Task Status</p>

                      <p className="mt-1 font-bold text-[#00B8B0]">
                        {request.task?.status || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                      <p className="text-sm text-gray-500">From</p>

                      <p className="mt-1 break-words font-black text-gray-900">
                        {request.requester.name || 'Unknown Student'}
                      </p>

                      <p className="mt-1 break-all text-sm text-gray-600">
                        {request.requester.email}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                      <p className="text-sm text-gray-500">Reassign To</p>

                      <p className="mt-1 break-words font-black text-gray-900">
                        {request.target.name || 'Unknown Student'}
                      </p>

                      <p className="mt-1 break-all text-sm text-gray-600">
                        {request.target.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
                    <p className="text-sm font-semibold text-gray-500">
                      Reason
                    </p>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800">
                      {request.reason || 'No reason provided.'}
                    </p>
                  </div>

{aiDecisions[request.id] && (
  <div className="mt-5 rounded-2xl border border-violet-300 bg-violet-50 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-violet-800">
          AI Recommendation
        </p>

        <h4 className="mt-1 text-2xl font-black capitalize text-violet-900">
          {aiDecisions[request.id].decision === 'approved'
            ? 'Approve Reassignment'
            : aiDecisions[request.id].decision === 'rejected'
            ? 'Reject Reassignment'
            : 'Needs Teacher Review'}
        </h4>
      </div>

      <div className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm">
        <p className="text-gray-500">Confidence</p>

        <p className="font-black capitalize text-violet-800">
          {aiDecisions[request.id].confidence}
        </p>
      </div>
    </div>

    <div className="mt-4 rounded-2xl border border-violet-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-500">
        AI Explanation
      </p>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
        {aiDecisions[request.id].reason}
      </p>
    </div>

    {aiDecisions[request.id].criteria?.length > 0 && (
      <div className="mt-4 rounded-2xl border border-violet-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-500">
          Decision Criteria
        </p>

        <ul className="mt-3 space-y-2">
          {aiDecisions[request.id].criteria.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-gray-700"
            >
              <span className="mt-1 h-2 w-2 rounded-full bg-violet-500" />

              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}

<div className="mt-5 flex flex-col gap-3 lg:flex-row">
  <button
    onClick={() => handleAiDecision(request)}
    disabled={aiLoadingId === request.id}
    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-5 text-sm font-black text-violet-700 transition-all hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <Bot size={18} />

    {aiLoadingId === request.id
      ? 'AI Deciding...'
      : 'Let AI Decide'}
  </button>

  <button
    onClick={() => handleDecision(request, 'approved')}
    className="h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 text-sm font-black text-black transition-all hover:opacity-90"
  >
    Approve
  </button>

  <button
    onClick={() => handleDecision(request, 'rejected')}
    className="h-12 rounded-xl border border-red-300 bg-white px-5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
  >
    Reject
  </button>
</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-black">
              Recent Decisions
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Latest approved or rejected reassignment requests.
            </p>
          </div>

          {recentDecisions.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
              No recent decisions yet.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-3xl border border-gray-400">
              <div className="max-h-[420px] overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr>
                      <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                        Task
                      </th>

                      <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                        Student
                      </th>

                      <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                        Decision
                      </th>

                      <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentDecisions.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="border-b border-gray-400 p-4 font-bold text-gray-900">
                          {request.task?.title || 'Untitled Task'}
                        </td>

                        <td className="border-b border-gray-400 p-4 text-gray-700">
                          {request.requester.name || 'Unknown Student'}
                        </td>

                        <td className="border-b border-gray-400 p-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                              request.status === 'approved'
                                ? 'border-green-300 bg-green-50 text-green-700'
                                : 'border-red-300 bg-red-50 text-red-600'
                            }`}
                          >
                            {request.status}
                          </span>
                        </td>

                        <td className="border-b border-gray-400 p-4 text-gray-700">
                          {request.decided_at
                            ? new Date(request.decided_at).toLocaleString()
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default TeacherReassignmentsPage