import { useEffect, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { Link } from 'react-router-dom'
import { getProjectTypeLabel } from '../../../config/projectTypes'
import { Bot, X } from 'lucide-react'

function TeacherAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [classes, setClasses] = useState([])
  const [projects, setProjects] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [aiMessages, setAiMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am your Teacher AI Assistant. I can help summarize projects, analyze group performance, detect inactive students, and explain evaluations.',
    },
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.rpc('get_teacher_analytics')

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setAnalytics(
      data?.[0] || {
        total_classes_count: 0,
        total_projects_count: 0,
        total_groups_count: 0,
        completed_group_projects_count: 0,
        pending_reassignments_count: 0,
        total_tasks_count: 0,
        submitted_tasks_count: 0,
        task_completion_rate: 0,
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data: classRows } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    const { data: projectRows } = await supabase
      .from('projects')
      .select('*')
      .eq('teacher_id', user.id)
      .order('deadline', { ascending: true })

    let groupRows = []

    const classIds = (classRows || []).map((item) => item.id)

    if (classIds.length > 0) {
      const { data } = await supabase
        .from('groups')
        .select('*')
        .in('class_id', classIds)

      groupRows = data || []
    }

    setClasses(classRows || [])
    setProjects(projectRows || [])
    setGroups(groupRows)
    setLoading(false)
  }

  async function fetchTeacherContext() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not found.')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .maybeSingle()

    const { data: teacherClasses } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    const { data: teacherProjects } = await supabase
      .from('projects')
      .select('*')
      .eq('teacher_id', user.id)
      .order('deadline', { ascending: true })

    const classIds = (teacherClasses || []).map((item) => item.id)
    const projectIds = (teacherProjects || []).map((item) => item.id)

    let teacherGroups = []
    let groupMembers = []
    let tasks = []
    let activities = []
    let evaluations = []
    let studentEvaluations = []

    if (classIds.length > 0) {
      const { data: groupRows } = await supabase
        .from('groups')
        .select('*')
        .in('class_id', classIds)

      teacherGroups = groupRows || []

      const groupIds = teacherGroups.map((group) => group.id)

      if (groupIds.length > 0) {
        const { data: memberRows } = await supabase
          .from('group_members')
          .select(`
            *,
            profiles (
              first_name,
              last_name,
              email
            )
          `)
          .in('group_id', groupIds)

        groupMembers = memberRows || []
      }
    }

    if (projectIds.length > 0) {
      const { data: taskRows } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles:assigned_to (
            first_name,
            last_name,
            email
          )
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      tasks = taskRows || []

      const { data: activityRows } = await supabase
        .from('project_activity_logs')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(50)

      activities = activityRows || []

      const { data: evaluationRows } = await supabase
        .from('project_evaluations')
        .select(`
          *,
          projects (
            title,
            project_type
          ),
          groups (
            group_name
          )
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      evaluations = evaluationRows || []

      const evaluationIds = evaluations.map((evaluation) => evaluation.id)

      if (evaluationIds.length > 0) {
        const { data: studentEvaluationRows } = await supabase
          .from('student_evaluations')
          .select(`
            *,
            profiles (
              first_name,
              last_name,
              email
            )
          `)
          .in('project_evaluation_id', evaluationIds)

        studentEvaluations = studentEvaluationRows || []
      }
    }

    const { data: aiStudentEvaluationContext } = await supabase.rpc(
      'get_teacher_ai_student_evaluation_context'
    )

    return {
      teacher: {
        id: user.id,
        email: profile?.email || user.email,
        name:
          `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
          user.email,
      },
      context: {
        classes: teacherClasses || [],
        projects: teacherProjects || [],
        groups: teacherGroups,
        groupMembers,
        tasks,
        activities,
        evaluations,
        studentEvaluations,
        studentEvaluationContext: aiStudentEvaluationContext || [],
      },
    }
  }

  async function handleAISubmit(e) {
    e.preventDefault()

    if (!aiInput.trim()) return

    const userQuestion = aiInput.trim()

    const userMessage = {
      role: 'user',
      content: userQuestion,
    }

    const updatedMessages = [...aiMessages, userMessage]

    setAiMessages(updatedMessages)
    setAiInput('')
    setAiLoading(true)

    const webhookUrl =
      import.meta.env.VITE_N8N_TEACHER_AI_ASSISTANT_WEBHOOK_URL

    if (!webhookUrl) {
      setAiMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'Missing n8n Teacher AI Assistant webhook URL in your .env file.',
        },
      ])
      setAiLoading(false)
      return
    }

    try {
      const teacherContext = await fetchTeacherContext()

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userQuestion,
          conversation_history: updatedMessages.slice(-10),
          ...teacherContext,
        }),
      })

      if (!response.ok) {
        throw new Error('AI assistant request failed.')
      }

      const result = await response.json()

      setAiMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: result.answer || 'I could not generate an answer.',
        },
      ])
    } catch (error) {
      console.error(error)

      setAiMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'Something went wrong while asking the AI assistant. Please check your n8n workflow and webhook URL.',
        },
      ])
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <DashboardLayout
      title="Teacher Panel"
      pageTitle="Analytics"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
              Analytics
            </h1>

            <p className="mt-2 max-w-3xl text-gray-500">
              Monitor class, project, group, and task performance.
            </p>
          </div>

          <button
            onClick={() => setIsAIModalOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 text-sm font-black text-black transition-all hover:opacity-90"
          >
            <Bot size={18} />
            Open AI Assistant
          </button>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading analytics...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Card
                title="Classes"
                value={analytics.total_classes_count}
                description="Handled classes"
              />

              <Card
                title="Projects"
                value={analytics.total_projects_count}
                description="Created projects"
              />

              <Card
                title="Groups"
                value={analytics.total_groups_count}
                description="Active student groups"
              />

              <Card
                title="Pending Requests"
                value={analytics.pending_reassignments_count}
                description="Reassignment requests"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card
                title="Task Completion Rate"
                value={`${analytics.task_completion_rate}%`}
                description={`${analytics.submitted_tasks_count}/${analytics.total_tasks_count} tasks submitted`}
              />

              <Card
                title="Completed Group Projects"
                value={analytics.completed_group_projects_count}
                description="Ready for evaluation"
              />

              <Card
                title="Total Tasks"
                value={analytics.total_tasks_count}
                description="Across all projects"
              />
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-4 shadow-sm sm:p-6">
              <SectionHeader
                title="Class Performance Overview"
                description="Classes currently handled by you."
              />

              {classes.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No classes yet.
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-gray-400">
                  <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="sticky top-0 z-10 bg-gray-100">
                        <tr>
                          <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                            Class
                          </th>
                          <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                            Section
                          </th>
                          <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                            Projects
                          </th>
                          <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                            Groups
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {classes.map((classItem) => {
                          const classProjects = projects.filter(
                            (project) => project.class_id === classItem.id
                          )

                          const classGroups = groups.filter(
                            (group) => group.class_id === classItem.id
                          )

                          return (
                            <tr key={classItem.id} className="hover:bg-gray-50">
                              <td className="border-b border-gray-400 p-4 font-bold text-gray-900">
                                {classItem.class_name}
                              </td>

                              <td className="border-b border-gray-400 p-4 text-gray-600">
                                {classItem.section}
                              </td>

                              <td className="border-b border-gray-400 p-4 text-gray-600">
                                {classProjects.length}
                              </td>

                              <td className="border-b border-gray-400 p-4 text-gray-600">
                                {classGroups.length}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-4 shadow-sm sm:p-6">
              <SectionHeader
                title="Project Overview"
                description="Project deadlines and statuses."
              />

              {projects.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No projects yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 6).map((project) => (
                    <Link
                      key={project.id}
                      to={`/teacher/analytics/projects/${project.id}`}
                      className="block rounded-3xl border border-gray-400 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-lg font-black text-gray-900">
                            {project.title}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-gray-500">
                            {getProjectTypeLabel(project.project_type)}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:min-w-[360px]">
                          <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                            <p className="text-gray-500">Status</p>
                            <p className="mt-1 font-bold text-gray-900">
                              {project.status}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                            <p className="text-gray-500">Deadline</p>
                            <p className="mt-1 font-bold text-gray-900">
                              {project.deadline
                                ? new Date(project.deadline).toLocaleString()
                                : 'No deadline'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                        <p className="text-xs text-gray-500">
                          Open detailed analytics
                        </p>

                        <span className="text-sm font-semibold text-[#00B8B0]">
                          Open Project
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-gray-400 bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-300 p-5">
              <div>
                <h2 className="mt-1 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-3xl font-black text-transparent">
                  Teacher AI Assistant
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Ask questions about classes, groups, projects, evaluations,
                  and student performance.
                </p>
              </div>

              <button
                onClick={() => setIsAIModalOpen(false)}
                className="rounded-xl border border-[#00CFC8]/40 bg-white p-2 text-[#00B8B0] transition-all hover:bg-gray-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-5">
              {aiMessages.map((item, index) => (
                <div
                  key={index}
                  className={`flex ${
                    item.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm ${
                      item.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-400 to-green-400 text-black'
                        : 'border border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {item.content}
                    </p>
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-gray-300 bg-white p-4 text-sm text-gray-600 shadow-sm">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={handleAISubmit}
              className="flex shrink-0 flex-col gap-3 border-t border-gray-300 p-4 sm:flex-row"
            >
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask about student performance, project progress, or evaluations..."
                className="h-12 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
              />

              <button
                disabled={aiLoading || !aiInput.trim()}
                className="h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-6 text-sm font-black text-black transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiLoading ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default TeacherAnalyticsPage