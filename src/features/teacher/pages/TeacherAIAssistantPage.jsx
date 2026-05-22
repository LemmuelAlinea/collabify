import { useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'

function TeacherAIAssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am your Teacher AI Assistant. I can help summarize projects, analyze group performance, detect inactive students, and explain evaluations.',
    },
  ])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

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

    const { data: classes } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('teacher_id', user.id)
      .order('deadline', { ascending: true })

    const classIds = (classes || []).map((item) => item.id)
    const projectIds = (projects || []).map((item) => item.id)

    let groups = []
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

      groups = groupRows || []

      const groupIds = groups.map((group) => group.id)

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
        classes: classes || [],
        projects: projects || [],
        groups,
        groupMembers,
        tasks,
        activities,
        evaluations,
        studentEvaluations,
        studentEvaluationContext: aiStudentEvaluationContext || [],
      },
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!input.trim()) return

    const userQuestion = input.trim()

    const userMessage = {
      role: 'user',
      content: userQuestion,
    }

    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    const webhookUrl =
      import.meta.env.VITE_N8N_TEACHER_AI_ASSISTANT_WEBHOOK_URL

    if (!webhookUrl) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'Missing n8n Teacher AI Assistant webhook URL in your .env file.',
        },
      ])
      setLoading(false)
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

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: result.answer || 'I could not generate an answer.',
        },
      ])
    } catch (error) {
      console.error(error)

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'Something went wrong while asking the AI assistant. Please check your n8n workflow and webhook URL.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="AI Assistant"
      navigation={teacherNavigation}
    >
      <div className="h-[calc(100vh-6rem)] border border-gray-300 rounded-lg flex flex-col bg-white">
        <div className="border-b border-gray-300 p-5">
          <h1 className="text-2xl font-bold">Teacher AI Assistant</h1>
          <p className="text-gray-600 mt-1">
            Ask questions about classes, groups, projects, evaluations, and
            student performance.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[75%] rounded-lg p-4 text-sm ${
                  message.role === 'user'
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-300 text-black'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-300 rounded-lg p-4 text-sm">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-gray-300 p-4 flex gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about student performance, project progress, or evaluations..."
            className="flex-1 border border-gray-300 rounded p-3"
          />

          <button
            disabled={loading || !input.trim()}
            className="bg-black text-white px-5 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </DashboardLayout>
  )
}

export default TeacherAIAssistantPage