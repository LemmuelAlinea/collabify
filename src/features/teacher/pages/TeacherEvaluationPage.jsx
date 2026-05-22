import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import { getProjectTypeLabel } from '../../../config/projectTypes'

function TeacherEvaluationPage() {
  const [completedGroups, setCompletedGroups] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchCompletedGroups()
  }, [])

  async function fetchCompletedGroups() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.rpc(
      'get_completed_project_groups_for_teacher'
    )

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const completedRows = data || []
    setCompletedGroups(completedRows)

    const projectIds = [...new Set(completedRows.map((item) => item.project_id))]
    const groupIds = [...new Set(completedRows.map((item) => item.group_id))]

    if (projectIds.length > 0 && groupIds.length > 0) {
      const { data: evalRows } = await supabase
        .from('project_evaluations')
        .select('*')
        .in('project_id', projectIds)
        .in('group_id', groupIds)

      setEvaluations(evalRows || [])
    } else {
      setEvaluations([])
    }

    setLoading(false)
  }

  function getEvaluationForItem(item) {
    return evaluations.find(
      (evaluation) =>
        evaluation.project_id === item.project_id &&
        evaluation.group_id === item.group_id
    )
  }

  async function handleCreateEvaluation(item) {
    setMessage('')

    const existingEvaluation = getEvaluationForItem(item)

    if (existingEvaluation) {
      setMessage('Evaluation already exists for this group project.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('User not found.')
      return
    }

    const { error } = await supabase.from('project_evaluations').insert({
      project_id: item.project_id,
      group_id: item.group_id,
      teacher_id: user.id,
      status: 'draft',
      ai_summary: 'AI evaluation will be generated later.',
    })

    if (error) {
      if (error.code === '23505') {
        setMessage('Evaluation already exists for this group project.')
      } else {
        setMessage(error.message)
      }

      return
    }

    setMessage('Evaluation draft created successfully.')
    await fetchCompletedGroups()
  }

  const aiEvaluationCount = evaluations.filter(
    (evaluation) => evaluation.status === 'ai_generated'
  ).length

  const finalizedCount = evaluations.filter(
    (evaluation) => evaluation.status === 'finalized'
  ).length

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Evaluation"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Evaluation
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            Review completed group projects and prepare student evaluations.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-black">
              How AI Evaluation Works
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              AI evaluation will only become available after a group marks a
              project as completed.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4 text-sm text-gray-700">
              Analyzes individual contribution scores based on task completion
              and uploads.
            </div>

            <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4 text-sm text-gray-700">
              Evaluates collaboration activity and response times.
            </div>

            <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4 text-sm text-gray-700">
              Considers task complexity and quality of submissions.
            </div>

            <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4 text-sm text-gray-700">
              Generates suggested grades that teachers can review and adjust.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Card
            title="Completed Groups"
            value={completedGroups.length}
            description="Ready for evaluation"
          />

          <Card
            title="AI Evaluations"
            value={aiEvaluationCount}
            description="Generated suggestions"
          />

          <Card
            title="Finalized Grades"
            value={finalizedCount}
            description="Completed evaluations"
          />
        </div>

        <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-black">
              Completed Group Projects
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Only completed group projects appear here.
            </p>
          </div>

          {loading ? (
            <p className="mt-5 text-gray-500">
              Loading completed projects...
            </p>
          ) : completedGroups.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
              No completed group projects yet.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {completedGroups.map((item) => {
                const evaluation = getEvaluationForItem(item)

                return (
                  <div
                    key={item.completion_id}
                    className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <h3 className="break-words text-2xl font-black text-gray-900">
                          {item.project_title}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-gray-500">
                          {getProjectTypeLabel(item.project_type)}
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                            <p className="text-xs text-gray-500">
                              Class
                            </p>

                            <p className="mt-1 font-bold text-gray-900">
                              {item.class_name} — {item.section}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                            <p className="text-xs text-gray-500">
                              Group
                            </p>

                            <p className="mt-1 font-bold text-gray-900">
                              {item.group_name}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:min-w-[420px]">
                        <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-3">
                          <p className="text-gray-500">
                            Completed At
                          </p>

                          <p className="mt-1 font-bold text-gray-900">
                            {new Date(
                              item.completed_at
                            ).toLocaleString()}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-3">
                          <p className="text-gray-500">
                            Evaluation Status
                          </p>

                          <p className="mt-1 font-bold text-[#00B8B0]">
                            {evaluation?.status || 'not created'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {item.completion_note && (
                      <div className="mt-5 rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                        <p className="text-sm font-semibold text-gray-500">
                          Completion Note
                        </p>

                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800">
                          {item.completion_note}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      {!evaluation && (
                        <button
                          onClick={() => handleCreateEvaluation(item)}
                          className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90"
                        >
                          Create Evaluation Draft
                        </button>
                      )}

                      <Link
                        to={`/teacher/evaluation/projects/${item.project_id}/groups/${item.group_id}`}
                        className="rounded-xl border border-[#00CFC8]/40 bg-white px-5 py-3 text-center text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                      >
                        Open Evaluation Details
                      </Link>

                      <button
                        disabled
                        className="cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-500"
                      >
                        Generate AI Evaluation Later
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default TeacherEvaluationPage