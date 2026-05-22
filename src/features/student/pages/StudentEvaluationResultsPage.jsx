import { useEffect, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { studentNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import { getProjectTypeLabel } from '../../../config/projectTypes'

function StudentEvaluationResultsPage() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchResults()
  }, [])

  async function fetchResults() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.rpc(
      'get_student_evaluation_results'
    )

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setResults(data || [])
    setLoading(false)
  }

  const filteredResults = results.filter((result) => {
    const searchValue = search.toLowerCase()

    return (
      String(result.project_title || '')
        .toLowerCase()
        .includes(searchValue) ||
      String(result.group_name || '')
        .toLowerCase()
        .includes(searchValue) ||
      String(result.project_type || '')
        .toLowerCase()
        .includes(searchValue)
    )
  })

  return (
    <DashboardLayout
      title="Student Panel"
      pageTitle="Evaluation Results"
      navigation={studentNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
              Evaluation Results
            </h1>

            <p className="mt-2 max-w-3xl text-gray-500">
              View finalized teacher evaluations, AI feedback, and contribution
              analytics.
            </p>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project, group, or type..."
            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8] lg:w-80"
          />
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading evaluation results...</p>
        ) : filteredResults.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
            No finalized evaluations found.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredResults.map((result) => (
              <div
                key={`${result.project_id}-${result.group_id}`}
                className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0]">
                        {getProjectTypeLabel(result.project_type)}
                      </span>

                      <span className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                        {result.group_name}
                      </span>
                    </div>

                    <h2 className="mt-3 break-words text-2xl font-black text-gray-900">
                      {result.project_title}
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                      Finalized:{' '}
                      {result.finalized_at
                        ? new Date(
                            result.finalized_at
                          ).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-gray-400 bg-gradient-to-br from-cyan-50 to-green-50 p-5 text-center xl:min-w-[220px]">
                    <p className="text-sm font-semibold text-gray-500">
                      Final Grade
                    </p>

                    <h2 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-700 bg-clip-text text-5xl font-black text-transparent">
                      {result.teacher_final_grade ?? 'N/A'}
                    </h2>

                    <p className="mt-2 text-xs text-gray-500">
                      Teacher Finalized Grade
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Card
                    title="Contribution"
                    value={`${result.contribution_score || 0}%`}
                    description="Analytics-based score"
                  />

                  <Card
                    title="Task Completion"
                    value={`${result.task_completion_score || 0}%`}
                    description="Submitted task ratio"
                  />

                  <Card
                    title="AI Suggested"
                    value={result.ai_suggested_grade || 0}
                    description="AI recommendation"
                  />

                  <Card
                    title="AI Confidence"
                    value={
                      result.ai_confidence_level
                        ? result.ai_confidence_level.charAt(0).toUpperCase() +
                          result.ai_confidence_level.slice(1)
                        : 'Medium'
                    }
                    description="Confidence level"
                  />
                </div>

                <div className="mt-5 rounded-3xl border border-gray-400 bg-[#F8FBFF] p-5">
                  <h3 className="text-xl font-black text-black">
                    AI Summary
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
                    {result.ai_summary || 'No AI summary provided.'}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-gray-400 bg-white p-5">
                    <h3 className="text-lg font-black text-black">
                      Strengths
                    </h3>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">
                      {result.ai_strengths ||
                        'No strengths provided.'}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-gray-400 bg-white p-5">
                    <h3 className="text-lg font-black text-black">
                      Weaknesses
                    </h3>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">
                      {result.ai_weaknesses ||
                        'No weaknesses provided.'}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-gray-400 bg-white p-5">
                    <h3 className="text-lg font-black text-black">
                      Improvement Suggestions
                    </h3>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">
                      {result.ai_improvement_suggestions ||
                        'No suggestions provided.'}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-gray-400 bg-white p-5">
                    <h3 className="text-lg font-black text-black">
                      Teacher Notes
                    </h3>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">
                      {result.teacher_notes ||
                        'No teacher notes provided.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default StudentEvaluationResultsPage