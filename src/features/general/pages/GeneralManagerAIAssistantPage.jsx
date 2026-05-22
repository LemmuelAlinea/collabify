import { useEffect, useRef, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { supabase } from '../../../lib/supabaseClient'
import { generalManagerNavigation } from '../config/generalNavigation'
import { Bot, SendHorizonal, Sparkles } from 'lucide-react'


function GeneralManagerAIAssistantPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  const bottomRef = useRef(null)

  useEffect(() => {
    fetchMessages()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages])

  async function fetchMessages() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('general_ai_chats')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (!error) {
      setMessages(data || [])
    }

    setLoading(false)
  }

async function handleSendMessage(e) {
  e.preventDefault()

  if (!input.trim() || sending) return

  setSending(true)
  setMessage('')

  const userMessage = input.trim()
  setInput('')

  const temporaryUserMessage = {
    id: `temp-user-${Date.now()}`,
    role: 'user',
    message: userMessage,
    created_at: new Date().toISOString(),
  }

  const temporaryAssistantMessage = {
    id: `temp-assistant-${Date.now()}`,
    role: 'assistant',
    message: 'Thinking...',
    created_at: new Date().toISOString(),
    isThinking: true,
  }

  setMessages((current) => [
    ...current,
    temporaryUserMessage,
    temporaryAssistantMessage,
  ])

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setMessage('User not found.')
    setSending(false)
    setMessages((current) =>
      current.filter((item) => item.id !== temporaryAssistantMessage.id)
    )
    return
  }

  const { error: userError } = await supabase
    .from('general_ai_chats')
    .insert({
      user_id: user.id,
      role: 'user',
      message: userMessage,
    })

  if (userError) {
    setMessage(userError.message)
    setSending(false)
    await fetchMessages()
    return
  }

  const { data: history } = await supabase
    .from('general_ai_chats')
    .select('role, message, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(20)

  const webhookUrl = import.meta.env.VITE_N8N_GENERAL_AI_ASSISTANT_WEBHOOK_URL

  if (!webhookUrl) {
    setMessage('Missing n8n general AI assistant webhook URL in .env file.')
    setSending(false)
    await fetchMessages()
    return
  }

  try {
    const { data: projects } = await supabase
      .from('general_projects')
      .select('*')
      .eq('project_manager_id', user.id)

    const { data: progress } = await supabase.rpc(
      'get_general_manager_project_progress',
      {
        manager_uuid: user.id,
      }
    )

    const { data: analytics } = await supabase.rpc(
      'get_general_manager_analytics',
      {
        manager_uuid: user.id,
      }
    )

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        message: userMessage,
        workplace: 'general',
        role: 'project_manager',
        chat_history: history || [],
        context: {
          projects: projects || [],
          project_progress: progress || [],
          analytics: analytics?.[0] || null,
        },
      }),
    })

    if (!response.ok) {
      setMessage('AI assistant failed to respond.')
      setSending(false)
      await fetchMessages()
      return
    }

    const result = await response.json()

    const aiResponse =
      result.reply ||
      result.response ||
      result.message ||
      result.text ||
      'I could not generate a response.'

    await supabase.from('general_ai_chats').insert({
      user_id: user.id,
      role: 'assistant',
      message: aiResponse,
    })

    setMessages((current) =>
      current.map((item) =>
        item.id === temporaryAssistantMessage.id
          ? {
              ...item,
              message: aiResponse,
              isThinking: false,
              created_at: new Date().toISOString(),
            }
          : item
      )
    )

    setSending(false)
  } catch (error) {
    console.error(error)
    setMessage('Unexpected error while contacting AI assistant.')
    setSending(false)
    await fetchMessages()
  }
}

  async function handleClearChat() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase
      .from('general_ai_chats')
      .delete()
      .eq('user_id', user.id)

    setMessages([])
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="AI Assistant"
      navigation={generalManagerNavigation}
    >
      <div className="h-[calc(100vh-100px)] flex flex-col text-white">
        <div className="mb-6">

          <h1 className="text-4xl font-black mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-transparent">
            AI Assistant
          </h1>

          <p className="text-black mt-2">
            AI-powered assistant for project planning, workload management,
            analytics insights, and reporting.
          </p>
        </div>

        <div className="flex-1 rounded-3xl border border-white/10 bg-white/10 backdrop-blur shadow-2xl overflow-hidden flex flex-col">
          <div className="border-b border-white/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-green-400 flex items-center justify-center text-black">
                <Bot size={24} />
              </div>

              <div>
                <h2 className="text-lg font-black text-black">
                  General AI Assistant
                </h2>

                <p className="text-sm text-gray-700">
                  Smart workplace project assistant
                </p>
              </div>
            </div>

            <button
              onClick={handleClearChat}
              className="cursor-pointer rounded-xl border border-cyan-400 bg-white px-4 py-2 text-sm font-semibold text-[#00CFC8] transition-all hover:bg-gray-50"
            >
              Clear Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <p>Loading conversation...</p>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="max-w-xl text-center">
                  <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-cyan-400 to-green-400 mx-auto flex items-center justify-center text-black">
                    <Sparkles size={36} />
                  </div>

                  <h2 className="text-2xl font-black mt-6">
                    Start a conversation
                  </h2>

                  <p className="text-gray-500 mt-3">
                    Ask about project planning, task organization,
                    productivity, workload balancing, reporting,
                    or project risks.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((chat) => (
                <div
                  key={chat.id}
                  className={`flex ${
                    chat.role === 'user'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-2xl rounded-3xl px-5 py-4 ${
                      chat.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-400 to-green-400 text-black'
                        : 'bg-[#001A5A]/80 border border-white/10'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {chat.message}
                    </p>

                    <p
                      className={`text-xs mt-3 ${
                        chat.role === 'user'
                          ? 'text-black/70'
                          : 'text-gray-400'
                      }`}
                    >
                      {new Date(chat.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}

            <div ref={bottomRef} />
          </div>

          {message && (
            <div className="px-6 pb-3 text-sm text-red-300">
              {message}
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            className="border-t border-white/10 p-4"
          >
            <div className="flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the AI assistant..."
                className="flex-1 rounded-2xl border border-white/10 bg-[#001A5A]/70 px-5 py-4 outline-none focus:border-cyan-300"
              />

<button
  type="submit"
  disabled={sending}
  className="cursor-pointer h-14 w-14 rounded-2xl bg-gradient-to-r from-cyan-400 to-green-400 flex items-center justify-center text-black disabled:opacity-50"
>
  <SendHorizonal size={22} />
</button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default GeneralManagerAIAssistantPage