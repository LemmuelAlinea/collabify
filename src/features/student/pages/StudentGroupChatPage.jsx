import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Bot,
  ChevronLeft,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { studentNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { isAIEnabled, logAIUsage } from '../../../lib/aiSystem'

function StudentGroupChatPage() {
  const { groupId } = useParams()

  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  // eslint-disable-next-line no-unused-vars
  const [uploading, setUploading] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [activeMobilePanel, setActiveMobilePanel] = useState(null)

  const bottomRef = useRef(null)

  useEffect(() => {
    fetchChatData()
  }, [groupId])

  useEffect(() => {
    if (!groupId) return

    const channel = supabase
      .channel(`student-group-chat-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        fetchMessages
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        fetchMessages
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId])

  useEffect(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [messages])

  async function fetchChatData() {
    setLoading(true)
    setErrorMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setErrorMessage('User not found.')
      setLoading(false)
      return
    }

    setCurrentUser(user)

    const { data: memberCheck } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('student_id', user.id)
      .maybeSingle()

    if (!memberCheck) {
      setErrorMessage('You do not have access to this group chat.')
      setLoading(false)
      return
    }

    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle()

    if (groupError) {
      setErrorMessage(groupError.message)
      setLoading(false)
      return
    }

    const { data: memberRows } = await supabase.rpc('get_group_members', {
      group_uuid: groupId,
    })

    setGroup(groupData)
    setMembers(memberRows || [])

    await fetchMessages()
    setLoading(false)
  }

  async function fetchMessages() {
    const { data: messageRows, error } = await supabase
      .from('group_messages')
      .select(`
        *,
        message_attachments (*)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    if (error) {
      setErrorMessage(error.message)
      return
    }

    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')

    const profileMap = {}

    ;(profileRows || []).forEach((profile) => {
      profileMap[profile.id] = profile
    })

    const formattedMessages = (messageRows || []).map((message) => ({
      ...message,
      senderProfile: profileMap[message.sender_id] || null,
      message_attachments: message.message_attachments || [],
    }))

    setMessages(formattedMessages)
  }

  function getSenderName(message) {
    return (
      `${message.senderProfile?.first_name || ''} ${
        message.senderProfile?.last_name || ''
      }`.trim() ||
      message.senderProfile?.email ||
      'Unknown User'
    )
  }

  function getSummaryPayloadMessages() {
    return messages
      .filter((message) => ['text', 'file'].includes(message.message_type))
      .slice(-40)
      .map((message) => ({
        sender: getSenderName(message),
        message: message.message,
        message_type: message.message_type,
        created_at: message.created_at,
      }))
  }

  function formatAiSummary(result) {
    let parsedResult = result

    const n8nText =
      result?.output?.[0]?.content?.[0]?.text ||
      result?.content?.[0]?.text ||
      result?.text ||
      ''

    if (n8nText) {
      try {
        const cleanedText = n8nText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim()

        parsedResult = JSON.parse(cleanedText)
      } catch {
        parsedResult = {
          summary: n8nText,
          key_decisions: [],
          responsibilities: [],
          deadlines: [],
          unresolved_issues: [],
        }
      }
    }

    return JSON.stringify({
      summary: parsedResult.summary || 'No summary generated.',
      key_decisions: Array.isArray(parsedResult.key_decisions)
        ? parsedResult.key_decisions
        : [],
      responsibilities: Array.isArray(parsedResult.responsibilities)
        ? parsedResult.responsibilities
        : [],
      deadlines: Array.isArray(parsedResult.deadlines)
        ? parsedResult.deadlines
        : [],
      unresolved_issues: Array.isArray(parsedResult.unresolved_issues)
        ? parsedResult.unresolved_issues
        : [],
    })
  }

async function handleSummarizeDiscussion() {
  setErrorMessage('')

  const aiEnabled = await isAIEnabled()

  if (!aiEnabled) {
    setErrorMessage('AI features are currently disabled by the platform admin.')
    return
  }

  const webhookUrl = import.meta.env.VITE_N8N_GROUP_SUMMARY_WEBHOOK_URL

  if (!webhookUrl) {
    setErrorMessage('Missing VITE_N8N_GROUP_SUMMARY_WEBHOOK_URL in .env file.')
    return
  }

  const discussionMessages = getSummaryPayloadMessages()

  if (discussionMessages.length === 0) {
    setErrorMessage('There are no messages to summarize yet.')
    return
  }

  setSummarizing(true)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        group_id: groupId,
        group_name: group?.group_name || 'Group Chat',
        messages: discussionMessages,
      }),
    })

    if (!response.ok) {
      await logAIUsage({
        featureName: 'group_discussion_summary',
        workspace: 'educational',
        status: 'failed',
        metadata: {
          group_id: groupId,
          message_count: discussionMessages.length,
          error: 'n8n request failed',
        },
      })

      setErrorMessage('AI summary request failed.')
      setSummarizing(false)
      return
    }

    const result = await response.json()
    const summaryMessage = formatAiSummary(result)

    const { error } = await supabase.from('group_messages').insert({
      class_id: group?.class_id || null,
      group_id: groupId,
      project_id: group?.project_id || null,
      sender_id: currentUser.id,
      message: summaryMessage,
      message_type: 'ai_summary',
    })

    if (error) {
      await logAIUsage({
        featureName: 'group_discussion_summary',
        workspace: 'educational',
        status: 'failed',
        metadata: {
          group_id: groupId,
          message_count: discussionMessages.length,
          error: error.message,
        },
      })

      setErrorMessage(error.message)
      setSummarizing(false)
      return
    }

    await logAIUsage({
      featureName: 'group_discussion_summary',
      workspace: 'educational',
      status: 'success',
      metadata: {
        group_id: groupId,
        message_count: discussionMessages.length,
      },
    })

    await fetchMessages()
  } catch (error) {
    console.error(error)

    await logAIUsage({
      featureName: 'group_discussion_summary',
      workspace: 'educational',
      status: 'failed',
      metadata: {
        group_id: groupId,
        error: error.message,
      },
    })

    setErrorMessage('Unexpected error while generating AI summary.')
  }

  setSummarizing(false)
}

  async function handleSendMessage(e) {
    e.preventDefault()

    const content = messageText.trim()

    if ((!content && !selectedFile) || !currentUser) return

    setSending(true)
    setErrorMessage('')

    let filePayload = null

    if (selectedFile) {
      const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${groupId}/${Date.now()}-${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from('group-chat-files')
        .upload(filePath, selectedFile)

      if (uploadError) {
        setErrorMessage(uploadError.message)
        setSending(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('group-chat-files')
        .getPublicUrl(filePath)

      filePayload = {
        file_name: selectedFile.name,
        file_url: publicUrlData.publicUrl,
        file_path: filePath,
        file_type: selectedFile.type || 'file',
        file_size: selectedFile.size,
      }
    }

    const { data: messageRow, error: messageError } = await supabase
      .from('group_messages')
      .insert({
        class_id: group?.class_id || null,
        group_id: groupId,
        project_id: group?.project_id || null,
        sender_id: currentUser.id,
        message: content || selectedFile?.name || '',
        message_type: selectedFile ? 'file' : 'text',
      })
      .select()
      .single()

    if (messageError) {
      setErrorMessage(messageError.message)
      setSending(false)
      return
    }

    if (filePayload) {
      const { error: attachmentError } = await supabase
        .from('message_attachments')
        .insert({
          message_id: messageRow.id,
          ...filePayload,
        })

      if (attachmentError) {
        setErrorMessage(attachmentError.message)
        setSending(false)
        return
      }
    }

    setMessageText('')
    setSelectedFile(null)
    await fetchMessages()
    setSending(false)
  }

  async function handleDeleteMessage(messageId) {
    const confirmed = window.confirm('Delete this message?')
    if (!confirmed) return

    const { error } = await supabase
      .from('group_messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', currentUser.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setMessages((current) => current.filter((item) => item.id !== messageId))
  }

  function getFileUrl(attachment) {
    if (attachment.file_path) {
      const { data } = supabase.storage
        .from('group-chat-files')
        .getPublicUrl(attachment.file_path)

      return data.publicUrl
    }

    return attachment.file_url || ''
  }

  function renderAttachment(attachment, isMine) {
    const fileName = attachment.file_name || ''
    const fileUrl = getFileUrl(attachment)
    const lowerName = fileName.toLowerCase()

    if (lowerName.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
      return (
        <div className="mt-3">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-h-[260px] w-full rounded-2xl border border-gray-300 bg-white object-contain"
          />

          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className={`mt-2 inline-block break-all text-sm font-semibold hover:underline ${
              isMine ? 'text-black' : 'text-[#00B8B0]'
            }`}
          >
            Open image
          </a>
        </div>
      )
    }

    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className={`mt-3 inline-flex max-w-full rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
          isMine
            ? 'border-black/20 bg-white/50 text-black hover:bg-white/70'
            : 'border-[#00CFC8]/40 bg-white text-[#00B8B0] hover:bg-gray-50'
        }`}
      >
        <span className="break-all">Open {fileName || 'file'}</span>
      </a>
    )
  }

  function renderAiSummary(message) {
    let summaryData = null

    try {
      summaryData = JSON.parse(message.message)
    } catch {
      summaryData = {
        summary: message.message,
        key_decisions: [],
        responsibilities: [],
        deadlines: [],
        unresolved_issues: [],
      }
    }

    return (
      <div className="flex justify-center">
        <div className="w-full max-w-3xl rounded-3xl border border-[#00CFC8]/40 bg-gradient-to-br from-cyan-50 to-green-50 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-gradient-to-r from-cyan-400 to-green-400 p-2 text-black">
              <Bot size={18} />
            </div>

            <div>
              <p className="font-black text-gray-900">AI Discussion Summary</p>
              <p className="text-xs text-gray-500">
                {new Date(message.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {summaryData.summary}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <SummaryList title="Key Decisions" items={summaryData.key_decisions} />
            <SummaryList title="Responsibilities" items={summaryData.responsibilities} />
            <SummaryList title="Deadlines" items={summaryData.deadlines} />
            <SummaryList title="Unresolved Issues" items={summaryData.unresolved_issues} />
          </div>
        </div>
      </div>
    )
  }

  function SummaryList({ title, items }) {
    return (
      <div className="rounded-2xl border border-gray-300 bg-white p-4">
        <p className="font-black text-gray-900">{title}</p>

        {items?.length ? (
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {items.map((item, index) => (
              <li key={`${title}-${index}`} className="break-words">
                • {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-400">None listed.</p>
        )}
      </div>
    )
  }

  const sharedFiles = messages
    .flatMap((message) =>
      (message.message_attachments || []).map((attachment) => ({
        ...attachment,
        messageCreatedAt: message.created_at,
      }))
    )
    .sort((a, b) => new Date(b.messageCreatedAt) - new Date(a.messageCreatedAt))

  const membersPanel = (
    <div className="rounded-3xl border border-gray-300 bg-white p-4 shadow-sm">
      <h2 className="text-2xl font-black text-black">Group Members</h2>
      <p className="mt-1 text-sm text-gray-500">
        Students inside this private group.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-1">
        {members.map((member) => (
          <div
            key={member.member_id}
            className="rounded-2xl border border-gray-300 bg-[#F4F8FF] p-3"
          >
            <p className="line-clamp-1 text-sm font-black text-gray-900">
              {member.first_name} {member.last_name}
            </p>

            <p className="mt-1 break-all text-xs text-gray-500">
              {member.email}
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  const sharedFilesPanel = (
    <div className="rounded-3xl border border-gray-300 bg-white p-4 shadow-sm">
      <h2 className="text-2xl font-black text-black">Shared Files</h2>
      <p className="mt-1 text-sm text-gray-500">
        Recent files sent in this group.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {sharedFiles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-500">
            No shared files yet.
          </div>
        ) : (
          sharedFiles.map((attachment) => (
            <a
              key={attachment.id}
              href={getFileUrl(attachment)}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-gray-300 bg-[#F8FBFF] p-3 transition-all hover:border-[#00CFC8]"
            >
              <p className="line-clamp-2 break-all text-sm font-black text-[#00B8B0]">
                {attachment.file_name || 'File'}
              </p>

              <p className="mt-2 text-xs text-gray-500">
                {new Date(attachment.messageCreatedAt).toLocaleString()}
              </p>
            </a>
          ))
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <DashboardLayout
        title="{title}"
        pageTitle="Group Chat"
        navigation={studentNavigation}
      >
        <p className="text-gray-500">Loading group chat...</p>
      </DashboardLayout>
    )
  }

  if (!group) {
    return (
      <DashboardLayout
        title="{title}"
        pageTitle="Group Chat"
        navigation={studentNavigation}
      >
        <p className="text-gray-500">
          {errorMessage || 'Group chat not found.'}
        </p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="{title}"
      pageTitle="Group Chat"
      navigation={studentNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <Link
            to={`/student/classes/${group.class_id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
          >
            <ChevronLeft size={18} />
            Back to Class
          </Link>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-sm font-semibold uppercase tracking-[0.2em] text-transparent">
                Private Group Communication
              </p>

              <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
                {group.group_name}
              </h1>

              <p className="mt-2 max-w-3xl text-gray-500">
                Communicate only with your assigned group members.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSummarizeDiscussion}
              disabled={summarizing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 text-sm font-black text-black transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={18} />
              {summarizing ? 'Summarizing...' : 'Summarize Discussion'}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 xl:hidden">
            <button
              type="button"
              onClick={() =>
                setActiveMobilePanel(
                  activeMobilePanel === 'members' ? null : 'members'
                )
              }
              className={`flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-3xl border p-4 text-center shadow-sm transition-all ${
                activeMobilePanel === 'members'
                  ? 'border-[#00CFC8] bg-gradient-to-r from-cyan-400 to-green-400 text-black'
                  : 'border-gray-300 bg-white text-gray-900 hover:border-[#00CFC8]'
              }`}
            >
              <Users size={24} />
              <span className="text-sm font-black">Group Members</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveMobilePanel(
                  activeMobilePanel === 'files' ? null : 'files'
                )
              }
              className={`flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-3xl border p-4 text-center shadow-sm transition-all ${
                activeMobilePanel === 'files'
                  ? 'border-[#00CFC8] bg-gradient-to-r from-cyan-400 to-green-400 text-black'
                  : 'border-gray-300 bg-white text-gray-900 hover:border-[#00CFC8]'
              }`}
            >
              <Paperclip size={24} />
              <span className="text-sm font-black">Shared Files</span>
            </button>
          </div>

          {activeMobilePanel === 'members' && (
            <div className="xl:hidden">{membersPanel}</div>
          )}

          {activeMobilePanel === 'files' && (
            <div className="xl:hidden">{sharedFilesPanel}</div>
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)_280px]">
            <div className="hidden xl:block">{membersPanel}</div>

            <div className="min-w-0">
              <main className="flex h-[75vh] min-h-[560px] flex-col overflow-hidden rounded-3xl border border-gray-300 bg-white shadow-sm">
                <div className="shrink-0 border-b border-gray-200 p-4">
                  <h2 className="text-2xl font-black text-black">Group Chat</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Academic and project-centered discussion only.
                  </p>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#F8FBFF] p-4">
                  {messages.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-gray-400 bg-white p-8 text-center text-gray-500">
                      No messages yet. Start your group discussion.
                    </div>
                  ) : (
                    messages.map((chatMessage) => {
                      if (chatMessage.message_type === 'ai_summary') {
                        return (
                          <div key={chatMessage.id}>
                            {renderAiSummary(chatMessage)}
                          </div>
                        )
                      }

                      const isMine = chatMessage.sender_id === currentUser?.id

                      return (
                        <div
                          key={chatMessage.id}
                          className={`flex ${
                            isMine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[86%] rounded-3xl border px-4 py-3 shadow-sm sm:max-w-[75%] ${
                              isMine
                                ? 'border-[#00CFC8]/40 bg-gradient-to-r from-cyan-400 to-green-400 text-black'
                                : 'border-gray-300 bg-white text-gray-900'
                            }`}
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p
                                className={`text-xs font-black ${
                                  isMine ? 'text-black' : 'text-[#00B8B0]'
                                }`}
                              >
                                {isMine ? 'You' : getSenderName(chatMessage)}
                              </p>

                              {isMine && !chatMessage.isOptimistic && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteMessage(chatMessage.id)
                                  }
                                  className="rounded-lg p-1 transition-all hover:bg-black/10"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>

                            {chatMessage.message && (
                              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                {chatMessage.message}
                              </p>
                            )}

                            {(chatMessage.message_attachments || []).map(
                              (attachment) => (
                                <div key={attachment.id}>
                                  {renderAttachment(attachment, isMine)}
                                </div>
                              )
                            )}

                            <p
                              className={`mt-3 text-[11px] ${
                                isMine ? 'text-black/70' : 'text-gray-500'
                              }`}
                            >
                              {new Date(chatMessage.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}

                  <div ref={bottomRef} />
                </div>

                {selectedFile && (
                  <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                    <div className="rounded-xl border border-[#00CFC8]/40 bg-[#EAF2FF] px-3 py-2">
                      Attached:{' '}
                      <span className="font-bold">{selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="ml-3 font-bold text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className="shrink-0 border-t border-gray-200 bg-white p-3"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[52px_1fr_120px]">
                    <label className="flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-[#00CFC8]/40 bg-white text-[#00B8B0] transition-all hover:bg-gray-50">
                      <Paperclip size={20} />

                      <input
                        type="file"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          setSelectedFile(file || null)
                          e.target.value = ''
                        }}
                      />
                    </label>

                    <input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={
                        uploading
                          ? 'Uploading file...'
                          : 'Write a project-centered message...'
                      }
                      disabled={uploading}
                      className="h-11 rounded-2xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8] disabled:bg-gray-100"
                    />

                    <button
                      disabled={
                        sending ||
                        uploading ||
                        (!messageText.trim() && !selectedFile)
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 text-sm font-black text-black transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send size={18} />
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              </main>
            </div>

            <div className="hidden xl:block">{sharedFilesPanel}</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default StudentGroupChatPage