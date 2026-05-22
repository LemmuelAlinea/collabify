import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { studentNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { getProjectTypeLabel } from '../../../config/projectTypes'
import { isAIEnabled, logAIUsage } from '../../../lib/aiSystem'

function StudentProjectDetailsPage() {
  const { projectId } = useParams()

  const [project, setProject] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [myGroup, setMyGroup] = useState(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [canComplete, setCanComplete] = useState(false)
  const [completionNote, setCompletionNote] = useState('')
  const [tasks, setTasks] = useState([])
  const [taskVersions, setTaskVersions] = useState({})
  const [taskSubmissions, setTaskSubmissions] = useState({})
  const [activityLogs, setActivityLogs] = useState([])
  const [groupMembers, setGroupMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [message, setMessage] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [groupMessages, setGroupMessages] = useState([])
  const [chatMessage, setChatMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const chatEndRef = useRef(null)

  const [aiFiles, setAiFiles] = useState([])
  const [uploadingAiFile, setUploadingAiFile] = useState(false)
  const [generatingAiTasks, setGeneratingAiTasks] = useState(false)

  const [reassignmentModal, setReassignmentModal] = useState({
    isOpen: false,
    task: null,
  })

  const [reassignmentForm, setReassignmentForm] = useState({
    requestedTo: '',
    reason: '',
  })

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  })

  const [claimModal, setClaimModal] = useState({
    isOpen: false,
    task: null,
  })

  useEffect(() => {
    if (!isChatOpen) return

    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [groupMessages, isChatOpen])

  useEffect(() => {
    if (!myGroup?.group_id || !projectId) return

    const channel = supabase
      .channel(`project-tasks-${projectId}-${myGroup.group_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `group_id=eq.${myGroup.group_id}`,
        },
        (payload) => {
          const changedTask = payload.new || payload.old

          if (changedTask.project_id !== projectId) return

          fetchProjectDetails()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [myGroup?.group_id, projectId])

  useEffect(() => {
    fetchProjectDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    if (!myGroup?.group_id || !projectId) return

    const channel = supabase
      .channel(`group-chat-${projectId}-${myGroup.group_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${myGroup.group_id}`,
        },
        async (payload) => {
          if (payload.new.project_id !== projectId) return

          const { data } = await supabase
            .from('group_messages')
            .select(`
              *,
              profiles (
                first_name,
                last_name
              )
            `)
            .eq('id', payload.new.id)
            .maybeSingle()

          if (data) {
            setGroupMessages((current) => {
              const alreadyExists = current.some(
                (messageItem) => messageItem.id === data.id
              )

              if (alreadyExists) return current

              return [...current, data]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [myGroup?.group_id, projectId])

  function getMemberTaskCounts() {
    return groupMembers.map((member) => {
      const activeCount = tasks.filter(
        (task) =>
          task.assigned_to === member.student_id &&
          task.status !== 'submitted' &&
          task.status !== 'completed'
      ).length

      return {
        ...member,
        activeCount,
      }
    })
  }

  function getRecommendedMemberForTask() {
    const counts = getMemberTaskCounts()

    if (counts.length === 0) return null

    return [...counts].sort((a, b) => a.activeCount - b.activeCount)[0]
  }

  function openClaimModal(task) {
    setClaimModal({
      isOpen: true,
      task,
    })
  }

  function closeClaimModal() {
    setClaimModal({
      isOpen: false,
      task: null,
    })
  }

  function handleTaskFormChange(e) {
    setTaskForm({
      ...taskForm,
      [e.target.name]: e.target.value,
    })
  }

  function handleReassignmentChange(e) {
    setReassignmentForm({
      ...reassignmentForm,
      [e.target.name]: e.target.value,
    })
  }

  function openReassignmentModal(task) {
    setReassignmentModal({
      isOpen: true,
      task,
    })

    setReassignmentForm({
      requestedTo: '',
      reason: '',
    })
  }

  function closeReassignmentModal() {
    setReassignmentModal({
      isOpen: false,
      task: null,
    })

    setReassignmentForm({
      requestedTo: '',
      reason: '',
    })
  }

  async function fetchProjectDetails() {
    if (!project) {
      setLoading(true)
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    setCurrentUser(user)

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError) {
      setMessage(projectError.message)
      setLoading(false)
      return
    }

    const { data: studentGroup } = await supabase.rpc(
      'get_student_group_in_class',
      {
        class_uuid: projectData.class_id,
        student_uuid: user.id,
      }
    )

    const assignedGroup = studentGroup?.[0] || null

    let members = []
    let started = false
    let completed = false
    let completionAllowed = false
    let taskRows = []
    let uploadedAiFiles = []

    if (assignedGroup) {
      const { data: groupMemberRows } = await supabase.rpc(
        'get_group_members',
        {
          group_uuid: assignedGroup.group_id,
        }
      )

      members = groupMemberRows || []

      const { data: messages } = await supabase
        .from('group_messages')
        .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
        .eq('project_id', projectId)
        .eq('group_id', assignedGroup.group_id)
        .order('created_at', { ascending: true })

      setGroupMessages(messages || [])

      const { data: startRecord } = await supabase
        .from('project_starts')
        .select('*')
        .eq('project_id', projectId)
        .eq('group_id', assignedGroup.group_id)
        .maybeSingle()

      started = Boolean(startRecord)

      const { data: completionRecord } = await supabase
        .from('project_completions')
        .select('*')
        .eq('project_id', projectId)
        .eq('group_id', assignedGroup.group_id)
        .maybeSingle()

      completed = Boolean(completionRecord)

      const { data: fetchedTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('group_id', assignedGroup.group_id)
        .order('created_at', { ascending: false })

      taskRows = fetchedTasks || []

      const { data: aiUploads } = await supabase
        .from('ai_task_generation_uploads')
        .select('*')
        .eq('project_id', projectId)
        .eq('group_id', assignedGroup.group_id)
        .order('created_at', { ascending: false })

      uploadedAiFiles = aiUploads || []

      const { data: canCompleteResult } = await supabase.rpc(
        'can_group_complete_project',
        {
          project_uuid: projectId,
          group_uuid: assignedGroup.group_id,
        }
      )

      completionAllowed = Boolean(canCompleteResult)
    }

    const versionsMap = {}
    const submissionsMap = {}

    for (const task of taskRows) {
      const { data: versions } = await supabase
        .from('task_versions')
        .select('*')
        .eq('task_id', task.id)
        .order('version_number', { ascending: false })

      versionsMap[task.id] = versions || []

      const { data: submission } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('task_id', task.id)
        .maybeSingle()

      submissionsMap[task.id] = submission || null
    }

    let logs = []

    if (assignedGroup) {
      const { data } = await supabase
        .from('project_activity_logs')
        .select('*')
        .eq('project_id', projectId)
        .eq('group_id', assignedGroup.group_id)
        .order('created_at', { ascending: false })

      logs = data || []
    }

    setProject(projectData)
    setMyGroup(assignedGroup)
    setHasStarted(started)
    setIsCompleted(completed)
    setCanComplete(completionAllowed)
    setTasks(taskRows)
    setTaskVersions(versionsMap)
    setTaskSubmissions(submissionsMap)
    setActivityLogs(logs || [])
    setGroupMembers(members)
    setLoading(false)
    setAiFiles(uploadedAiFiles)
  }

  async function handleStartProject() {
    setStarting(true)
    setMessage('')

    if (!myGroup || !currentUser) {
      setMessage('You must be assigned to a group before starting this project.')
      setStarting(false)
      return
    }

    const { error } = await supabase.from('project_starts').insert({
      project_id: projectId,
      group_id: myGroup.group_id,
      started_by: currentUser.id,
    })

    if (error) {
      setMessage(
        error.code === '23505'
          ? 'Your group has already started this project.'
          : error.message
      )
      setStarting(false)
      return
    }

    await supabase.from('project_activity_logs').insert({
      project_id: projectId,
      group_id: myGroup.group_id,
      user_id: currentUser.id,
      activity_type: 'project_started',
      description: `${myGroup.group_name} started the project.`,
    })

    setStarting(false)
    await fetchProjectDetails()
  }

  async function handleCreateManualTask(e) {
    e.preventDefault()
    setMessage('')

    if (!myGroup || !currentUser) {
      setMessage('You must be assigned to a group before creating tasks.')
      return
    }

    if (!hasStarted) {
      setMessage('Start the project first before creating tasks.')
      return
    }

    if (isCompleted) {
      setMessage('This project is already completed. You cannot create new tasks.')
      return
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        group_id: myGroup.group_id,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        due_date: taskForm.dueDate || null,
        created_by: currentUser.id,
        source: 'manual',
        status: 'unclaimed',
        category: 'manual',
        difficulty: 'medium',
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase.from('task_activity_logs').insert({
      task_id: task.id,
      user_id: currentUser.id,
      activity_type: 'task_created',
      description: `Manual task "${taskForm.title}" was created.`,
    })

    await supabase.from('project_activity_logs').insert({
      project_id: projectId,
      group_id: myGroup.group_id,
      user_id: currentUser.id,
      activity_type: 'manual_task_created',
      description: `Manual task "${taskForm.title}" was created.`,
    })

    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
    })

    await fetchProjectDetails()
  }

  async function handleDeleteUnclaimedTask(task) {
    setMessage('')

    if (isCompleted) {
      setMessage('This project is already completed.')
      return
    }

    if (task.assigned_to) {
      setMessage('You cannot delete a task that has already been claimed.')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete this task?\n\nTask: ${task.title}\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)
      .eq('group_id', myGroup.group_id)
      .is('assigned_to', null)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Task deleted successfully.')
    await fetchProjectDetails()
  }

  function getCurrentUserName() {
    const member = groupMembers.find(
      (item) => item.student_id === currentUser?.id
    )

    const fullName = `${member?.first_name || ''} ${
      member?.last_name || ''
    }`.trim()

    return fullName || currentUser?.email || 'A student'
  }

  async function handleClaimTask(taskId) {
    setMessage('')

    if (isCompleted) {
      setMessage('This project is already completed.')
      closeClaimModal()
      return
    }

    const selectedTask = tasks.find((task) => task.id === taskId)

    if (!selectedTask) {
      setMessage('Task not found.')
      closeClaimModal()
      return
    }

    if (selectedTask.assigned_to) {
      setMessage('This task has already been claimed.')
      closeClaimModal()
      await fetchProjectDetails()
      return
    }

    const myActiveTasks = tasks.filter(
      (task) =>
        task.assigned_to === currentUser.id &&
        task.status !== 'submitted' &&
        task.status !== 'completed'
    ).length

    const maxRecommendedActiveTasks =
      Math.ceil(
        tasks.filter(
          (task) => task.status !== 'submitted' && task.status !== 'completed'
        ).length / Math.max(groupMembers.length, 1)
      ) + 1

    if (myActiveTasks >= maxRecommendedActiveTasks) {
      const confirmed = window.confirm(
        `You already have ${myActiveTasks} active task(s). Recommended limit is ${maxRecommendedActiveTasks}. Do you still want to claim this task?`
      )

      if (!confirmed) {
        closeClaimModal()
        return
      }
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        assigned_to: currentUser.id,
        status: 'claimed',
      })
      .eq('id', taskId)
      .eq('group_id', myGroup.group_id)
      .is('assigned_to', null)
      .select()
      .maybeSingle()

    if (error) {
      setMessage(error.message)
      return
    }

    if (!data) {
      setMessage('This task may have already been claimed. Refreshing task list.')
      closeClaimModal()
      await fetchProjectDetails()
      return
    }

    await supabase.from('task_activity_logs').insert({
      task_id: taskId,
      user_id: currentUser.id,
      activity_type: 'task_claimed',
      description: 'Task was claimed by a student.',
    })

    await supabase.from('project_activity_logs').insert({
      project_id: projectId,
      group_id: myGroup.group_id,
      user_id: currentUser.id,
      activity_type: 'task_claimed',
      description: `${getCurrentUserName()} claimed task "${selectedTask.title}".`,
    })

    setMessage('Task claimed successfully.')
    closeClaimModal()
    await fetchProjectDetails()
  }

  async function handleStartTask(taskId) {
    setMessage('')

    if (isCompleted) {
      setMessage('This project is already completed.')
      return
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
      })
      .eq('id', taskId)
      .eq('assigned_to', currentUser.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase.from('task_activity_logs').insert({
      task_id: taskId,
      user_id: currentUser.id,
      activity_type: 'task_started',
      description: 'Task was started by the assigned student.',
    })

    const startedTask = tasks.find((task) => task.id === taskId)

    await supabase.from('project_activity_logs').insert({
      project_id: projectId,
      group_id: myGroup.group_id,
      user_id: currentUser.id,
      activity_type: 'task_started',
      description: `${getCurrentUserName()} started task "${startedTask?.title}".`,
    })

    await fetchProjectDetails()
  }

  async function handleUploadVersion(taskId, file) {
    setMessage('')

    if (!file) return

    if (isCompleted) {
      setMessage('This project is already completed.')
      return
    }

    const existingVersions = taskVersions[taskId] || []
    const nextVersion = existingVersions.length + 1
    const filePath = `${currentUser.id}/${taskId}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('task-files')
      .upload(filePath, file)

    if (uploadError) {
      setMessage(uploadError.message)
      return
    }

    const { error } = await supabase.from('task_versions').insert({
      task_id: taskId,
      uploaded_by: currentUser.id,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      version_number: nextVersion,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    await fetchProjectDetails()
  }

  async function handleDeleteVersion(versionId, filePath) {
    setMessage('')

    if (isCompleted) {
      setMessage('This project is already completed.')
      return
    }

    await supabase.storage.from('task-files').remove([filePath])

    const { error } = await supabase
      .from('task_versions')
      .delete()
      .eq('id', versionId)

    if (error) {
      setMessage(error.message)
      return
    }

    await fetchProjectDetails()
  }

  async function handleSetFinalVersion(taskId, versionId) {
    setMessage('')

    if (isCompleted) {
      setMessage('This project is already completed.')
      return
    }

    await supabase
      .from('task_versions')
      .update({ is_final: false })
      .eq('task_id', taskId)

    const { error } = await supabase
      .from('task_versions')
      .update({ is_final: true })
      .eq('id', versionId)

    if (error) {
      setMessage(error.message)
      return
    }

    await fetchProjectDetails()
  }

  async function handleSubmitTask(taskId) {
    setMessage('')

    if (isCompleted) {
      setMessage('This project is already completed.')
      return
    }

    const selectedTask = tasks.find((task) => task.id === taskId)

    if (!selectedTask) {
      setMessage('Task not found.')
      return
    }

    if (selectedTask.assigned_to !== currentUser.id) {
      setMessage('You can only submit tasks assigned to you.')
      return
    }

    if (selectedTask.status === 'submitted' || selectedTask.status === 'completed') {
      setMessage('This task has already been submitted.')
      return
    }

    const finalVersion = (taskVersions[taskId] || []).find(
      (version) => version.is_final
    )

    if (!finalVersion) {
      setMessage('Please select a final version first.')
      return
    }

    const { error } = await supabase.from('task_submissions').insert({
      task_id: taskId,
      submitted_by: currentUser.id,
      final_version_id: finalVersion.id,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase
      .from('tasks')
      .update({
        status: 'submitted',
      })
      .eq('id', taskId)
      .eq('assigned_to', currentUser.id)

    await supabase.from('task_activity_logs').insert({
      task_id: taskId,
      user_id: currentUser.id,
      activity_type: 'task_submitted',
      description: 'Task was submitted by the assigned student.',
    })

    await supabase.from('project_activity_logs').insert({
      project_id: projectId,
      group_id: myGroup.group_id,
      user_id: currentUser.id,
      activity_type: 'task_submitted',
      description: `${getCurrentUserName()} submitted task "${selectedTask.title}".`,
    })

    await fetchProjectDetails()
  }

  async function handleSubmitReassignment(e) {
    e.preventDefault()
    setMessage('')

    if (isCompleted) {
      setMessage('This project is already completed.')
      return
    }

    if (!currentUser || !project || !myGroup || !reassignmentModal.task) {
      setMessage('Missing reassignment information.')
      return
    }

    if (!reassignmentForm.requestedTo || !reassignmentForm.reason.trim()) {
      setMessage('Please select a member and enter a reason.')
      return
    }

    const { error } = await supabase
      .from('task_reassignment_requests')
      .insert({
        task_id: reassignmentModal.task.id,
        project_id: projectId,
        group_id: myGroup.group_id,
        requested_by: currentUser.id,
        requested_to: reassignmentForm.requestedTo,
        reason: reassignmentForm.reason,
        teacher_id: project.teacher_id,
        status: 'pending',
      })

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase.from('task_activity_logs').insert({
      task_id: reassignmentModal.task.id,
      user_id: currentUser.id,
      activity_type: 'reassignment_requested',
      description: 'A reassignment request was submitted for this task.',
    })

    closeReassignmentModal()
    await fetchProjectDetails()
  }

  async function handleCompleteProject(e) {
    e.preventDefault()
    setMessage('')
    setCompleting(true)

    if (!myGroup) {
      setMessage('You must be assigned to a group before completing this project.')
      setCompleting(false)
      return
    }

    const { error } = await supabase.rpc('complete_group_project', {
      project_uuid: projectId,
      group_uuid: myGroup.group_id,
      completion_text: completionNote || null,
    })

    if (error) {
      setMessage(error.message)
      setCompleting(false)
      return
    }

    setCompletionNote('')
    setCompleting(false)
    await fetchProjectDetails()
  }

  async function handleUploadAiFile(file) {
    setMessage('')

    if (!file) return

    if (!myGroup || !currentUser) {
      setMessage('You must belong to a group.')
      return
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]

    if (!allowedTypes.includes(file.type)) {
      setMessage('Only PDF, DOC, DOCX, and TXT files are allowed.')
      return
    }

    setUploadingAiFile(true)

    const filePath = `${currentUser.id}/${projectId}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('ai-task-files')
      .upload(filePath, file)

    if (uploadError) {
      setMessage(uploadError.message)
      setUploadingAiFile(false)
      return
    }

    const { error } = await supabase
      .from('ai_task_generation_uploads')
      .insert({
        project_id: projectId,
        group_id: myGroup.group_id,
        uploaded_by: currentUser.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        status: 'uploaded',
      })

    if (error) {
      setMessage(error.message)
      setUploadingAiFile(false)
      return
    }

    setUploadingAiFile(false)
    await fetchProjectDetails()
  }

  async function handleDeleteAiFile(fileId, filePath) {
    setMessage('')

    const { error: storageError } = await supabase.storage
      .from('ai-task-files')
      .remove([filePath])

    if (storageError) {
      setMessage(storageError.message)
      return
    }

    const { error: dbError } = await supabase
      .from('ai_task_generation_uploads')
      .delete()
      .eq('id', fileId)

    if (dbError) {
      setMessage(dbError.message)
      return
    }

    setMessage('File deleted successfully.')
    await fetchProjectDetails()
  }

async function handleGenerateAiTasks() {
  setMessage('')

  const aiEnabled = await isAIEnabled()

  if (!aiEnabled) {
    setMessage('AI features are currently disabled by the platform admin.')
    return
  }

  if (!myGroup || !currentUser || !project) {
    setMessage('Missing project or group information.')
    return
  }

  if (aiFiles.length === 0) {
    setMessage('Upload at least one planning file before generating AI tasks.')
    return
  }

  const existingAiTasks = tasks.filter((task) => task.source === 'ai')

  if (existingAiTasks.length > 0) {
    const confirmed = window.confirm(
      `This project already has ${existingAiTasks.length} AI-generated tasks. Generating again may create duplicates. Do you still want to continue?`
    )

    if (!confirmed) return
  }

  if (groupMembers.length === 0) {
    setMessage('No group members found.')
    return
  }

  const webhookUrl = import.meta.env.VITE_N8N_AI_TASK_WEBHOOK_URL

  if (!webhookUrl) {
    setMessage('Missing n8n webhook URL in .env file.')
    return
  }

  setGeneratingAiTasks(true)

  const payload = {
    project_id: projectId,
    group_id: myGroup.group_id,
    group_name: myGroup.group_name,
    project_title: project.title,
    project_description: project.description,
    project_type_label: getProjectTypeLabel(project.project_type),
    project_type: project.project_type,
    deadline: project.deadline,
    member_count: groupMembers.length,
    group_members: groupMembers.map((member) => ({
      student_id: member.student_id,
      name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
    })),
    files: aiFiles.map((file) => ({
      id: file.id,
      file_name: file.file_name,
      file_path: file.file_path,
      file_type: file.file_type,
      file_size: file.file_size,
    })),
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
        featureName: 'ai_task_generation',
        workspace: 'educational',
        status: 'failed',
        metadata: {
          project_id: projectId,
          group_id: myGroup.group_id,
          file_count: aiFiles.length,
          error: 'n8n request failed',
        },
      })

      setMessage('AI task generation failed.')
      setGeneratingAiTasks(false)
      return
    }

    const result = await response.json()

    const generatedTasks = Array.isArray(result.tasks) ? result.tasks : []

    if (generatedTasks.length === 0) {
      await logAIUsage({
        featureName: 'ai_task_generation',
        workspace: 'educational',
        status: 'failed',
        metadata: {
          project_id: projectId,
          group_id: myGroup.group_id,
          file_count: aiFiles.length,
          error: 'AI returned no tasks',
        },
      })

      setMessage('AI did not return any tasks.')
      setGeneratingAiTasks(false)
      return
    }

    const tasksToInsert = generatedTasks.map((task) => ({
      project_id: projectId,
      group_id: myGroup.group_id,
      title: task.title || 'Untitled Task',
      description: task.description || 'No description provided.',
      category: task.category || 'general',
      difficulty: ['easy', 'medium', 'hard'].includes(task.difficulty)
        ? task.difficulty
        : 'medium',
      priority: ['low', 'medium', 'high'].includes(task.priority)
        ? task.priority
        : 'medium',
      due_date: task.due_date || null,
      created_by: currentUser.id,
      source: 'ai',
      status: 'unclaimed',
    }))

    const { error } = await supabase.from('tasks').insert(tasksToInsert)

    if (error) {
      await logAIUsage({
        featureName: 'ai_task_generation',
        workspace: 'educational',
        status: 'failed',
        metadata: {
          project_id: projectId,
          group_id: myGroup.group_id,
          generated_task_count: generatedTasks.length,
          error: error.message,
        },
      })

      setMessage(error.message)
      setGeneratingAiTasks(false)
      return
    }

    for (const file of aiFiles) {
      await supabase
        .from('ai_task_generation_uploads')
        .update({
          status: 'processed',
          ai_response: result,
        })
        .eq('id', file.id)
    }

    await supabase.from('project_activity_logs').insert({
      project_id: projectId,
      group_id: myGroup.group_id,
      user_id: currentUser.id,
      activity_type: 'ai_tasks_generated',
      description: `AI generated ${generatedTasks.length} project tasks.`,
    })

    await logAIUsage({
      featureName: 'ai_task_generation',
      workspace: 'educational',
      status: 'success',
      metadata: {
        project_id: projectId,
        group_id: myGroup.group_id,
        file_count: aiFiles.length,
        generated_task_count: generatedTasks.length,
      },
    })

    setGeneratingAiTasks(false)
    setMessage(`AI successfully generated ${generatedTasks.length} tasks.`)

    await fetchProjectDetails()
  } catch (error) {
    console.error(error)

    await logAIUsage({
      featureName: 'ai_task_generation',
      workspace: 'educational',
      status: 'failed',
      metadata: {
        project_id: projectId,
        group_id: myGroup?.group_id,
        error: error.message,
      },
    })

    setMessage('Unexpected error while generating AI tasks.')
    setGeneratingAiTasks(false)
  }
}

  async function handleSendGroupMessage(e) {
    e.preventDefault()
    setMessage('')

    if (!chatMessage.trim()) return

    if (!currentUser || !project || !myGroup) {
      setMessage('Missing chat information.')
      return
    }

    setSendingMessage(true)

    const { error } = await supabase.from('group_messages').insert({
      class_id: project.class_id,
      group_id: myGroup.group_id,
      project_id: projectId,
      sender_id: currentUser.id,
      message: chatMessage.trim(),
    })

    if (error) {
      setMessage(error.message)
      setSendingMessage(false)
      return
    }

    const senderMember = groupMembers.find(
      (member) => member.student_id === currentUser.id
    )

    const senderName =
      `${senderMember?.first_name || ''} ${senderMember?.last_name || ''}`.trim() ||
      'A groupmate'

    await supabase.from('project_activity_logs').insert({
      project_id: projectId,
      group_id: myGroup.group_id,
      user_id: currentUser.id,
      activity_type: 'group_message_sent',
      description: `${senderName} sent a message in group chat.`,
    })

    const recipients = groupMembers.filter(
      (member) => member.student_id !== currentUser.id
    )

    for (const member of recipients) {
      await supabase.rpc('create_notification', {
        target_user_id: member.student_id,
        notification_title: 'New group message',
        notification_message: `${senderName}: ${chatMessage.trim()}`,
        notification_type: 'chat',
        project_uuid: projectId,
        task_uuid: null,
      })
    }

    setChatMessage('')
    setSendingMessage(false)
  }

  const submittedTasksCount = tasks.filter(
    (task) => task.status === 'submitted' || task.status === 'completed'
  ).length

  if (loading) {
    return (
      <DashboardLayout
        title="Student Panel"
        pageTitle="Project Details"
        navigation={studentNavigation}
      >
        <p className="text-gray-500">Loading project details...</p>
      </DashboardLayout>
    )
  }

  if (!project) {
    return (
      <DashboardLayout
        title="Student Panel"
        pageTitle="Project Details"
        navigation={studentNavigation}
      >
        <p className="text-gray-500">Project not found.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Student Panel"
      pageTitle="Project Details"
      navigation={studentNavigation}
    >
      <div className="space-y-6 text-gray-900">
<div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
  <div>
    <Link
      to={`/student/classes/${project.class_id}`}
      className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
    >
      <ChevronLeft size={18} />
      Back to Class
    </Link>

    <h1 className="mt-3 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
      {project.title}
    </h1>

    <p className="mt-2 max-w-3xl text-gray-500">
      {getProjectTypeLabel(project.project_type)}
    </p>
  </div>

  <div className="flex flex-wrap items-center gap-3 xl:pt-2">
    {hasStarted && myGroup && (
      <>
        <Link
          to={`/student/groups/${myGroup.group_id}/chat`}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-sm font-black text-white shadow-lg transition-all hover:scale-[1.02] hover:opacity-90"
        >
          Open Group Chat
        </Link>

        <button
          onClick={() => setIsTaskModalOpen(true)}
          className="h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 text-sm font-black text-black shadow-lg transition-all hover:scale-[1.02] hover:opacity-90"
        >
          Create Tasks
        </button>
      </>
    )}

            {!hasStarted && (
              <button
                onClick={handleStartProject}
                disabled={starting}
                className="h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
              >
                {starting ? 'Starting...' : 'Start Project'}
              </button>
            )}
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
          <Card
            title="Deadline"
            value={
              project.deadline
                ? new Date(project.deadline).toLocaleDateString()
                : 'None'
            }
            description="Project due date"
          />

          <Card
            title="My Group"
            value={myGroup?.group_name || 'None'}
            description="Assigned group"
          />

          <Card
            title="Project Started"
            value={hasStarted ? 'Yes' : 'No'}
            description="Project status"
          />

          <Card
            title="Tasks"
            value={tasks.length}
            description="Group tasks"
          />

          <Card
            title="Submitted"
            value={`${submittedTasksCount}/${tasks.length}`}
            description="Completed tasks"
          />
        </div>

        {isCompleted && (
          <div className="rounded-3xl border border-green-300 bg-green-50 p-5 shadow-sm">
            <h2 className="font-black text-green-800">Project Completed</h2>
            <p className="mt-1 text-sm text-green-700">
              Your group has marked this project as completed. Task editing is now locked.
            </p>
          </div>
        )}

        {hasStarted && !isCompleted && (
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Complete Project"
              description="You can complete the project only when all group tasks are submitted."
            />

            {!canComplete ? (
              <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                Submit all group tasks before marking the project as completed.
              </div>
            ) : (
              <form onSubmit={handleCompleteProject} className="space-y-3">
                <textarea
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Optional completion note"
                  className="min-h-24 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                />

                <button
                  disabled={completing}
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {completing ? 'Completing...' : 'Mark Project as Completed'}
                </button>
              </form>
            )}
          </div>
        )}

{hasStarted && (
  <div className="rounded-3xl border border-gray-400 bg-white p-4 shadow-sm sm:p-6">
    <SectionHeader
      title="Team Workload"
      description="Active tasks assigned to each group member."
    />

    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {getMemberTaskCounts().map((member) => (
        <div
          key={member.student_id}
          className="rounded-2xl border border-gray-300 bg-[#EAF2FF] p-3 sm:p-4"
        >
          <p className="line-clamp-1 text-sm font-black text-gray-900 sm:text-base">
            {member.first_name} {member.last_name}
          </p>

          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Active Tasks
          </p>

          <p className="mt-1 text-2xl font-black text-[#00B8B0]">
            {member.activeCount}
          </p>
        </div>
      ))}
    </div>
  </div>
)}

        {hasStarted && (
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Group Tasks"
              description="Only your group can access these."
            />

            {tasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                No tasks yet.
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => {
                  const versions = taskVersions[task.id] || []
                  const submission = taskSubmissions[task.id]
                  const isMine = task.assigned_to === currentUser?.id

                  return (
                    <div
                      key={task.id}
                      className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="break-words text-xl font-black text-gray-900">
                            {task.title}
                          </h3>

                          <p className="mt-1 break-words text-sm text-gray-600">
                            {task.description || 'No description.'}
                          </p>
                        </div>

                        <span className="w-fit rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0]">
                          {task.priority}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm lg:grid-cols-5">
                        <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                          <p className="text-gray-500">Status</p>
                          <p className="font-bold text-gray-900">
                            {task.status}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                          <p className="text-gray-500">Assigned</p>
                          <p className="font-bold text-gray-900">
                            {task.assigned_to
                              ? isMine
                                ? 'You'
                                : 'Groupmate'
                              : 'Unclaimed'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                          <p className="text-gray-500">Versions</p>
                          <p className="font-bold text-gray-900">
                            {versions.length}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                          <p className="text-gray-500">Category</p>
                          <p className="font-bold text-gray-900">
                            {task.category || 'general'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                          <p className="text-gray-500">Difficulty</p>
                          <p className="font-bold text-gray-900">
                            {task.difficulty || 'medium'}
                          </p>
                        </div>
                      </div>

                      {!isCompleted && (
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                          {!task.assigned_to && (
                            <>
                              <button
                                onClick={() => openClaimModal(task)}
                                className="h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 text-sm font-black text-black transition-all hover:opacity-90"
                              >
                                Claim Task
                              </button>

                              <button
                                onClick={() => handleDeleteUnclaimedTask(task)}
                                className="h-11 rounded-xl border border-red-300 bg-white px-5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
                              >
                                Delete Task
                              </button>
                            </>
                          )}

                          {isMine && task.status === 'claimed' && (
                            <button
                              onClick={() => handleStartTask(task.id)}
                              className="h-11 rounded-xl border border-[#00CFC8]/40 bg-white px-5 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                            >
                              Start Task
                            </button>
                          )}

                          {isMine && task.status === 'in_progress' && (
                            <button
                              onClick={() => openReassignmentModal(task)}
                              className="h-11 rounded-xl border border-[#00CFC8]/40 bg-white px-5 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                            >
                              Request Reassignment
                            </button>
                          )}
                        </div>
                      )}

                      {isMine &&
                        task.status !== 'submitted' &&
                        !isCompleted && (
                          <div className="mt-5 border-t border-gray-300 pt-4">
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <h4 className="font-black text-gray-900">
                                File Versions
                              </h4>

                              <input
                                type="file"
                                onChange={(e) =>
                                  handleUploadVersion(
                                    task.id,
                                    e.target.files[0]
                                  )
                                }
                                className="text-sm text-gray-700"
                              />
                            </div>

                            {versions.length === 0 ? (
                              <p className="text-sm text-gray-500">
                                No uploaded versions yet.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {versions.map((version) => (
                                  <div
                                    key={version.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-gray-400 bg-[#F8FBFF] p-3 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="min-w-0">
                                      <p className="break-all text-sm font-bold text-gray-900">
                                        V{version.version_number} —{' '}
                                        {version.file_name}
                                      </p>

                                      <p className="text-xs text-gray-500">
                                        {version.is_final
                                          ? 'Final Version'
                                          : 'Draft Version'}
                                      </p>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row">
                                      {!version.is_final && (
                                        <button
                                          onClick={() =>
                                            handleSetFinalVersion(
                                              task.id,
                                              version.id
                                            )
                                          }
                                          className="rounded-xl border border-[#00CFC8]/40 bg-white px-3 py-2 text-xs font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                                        >
                                          Set Final
                                        </button>
                                      )}

                                      <button
                                        onClick={() =>
                                          handleDeleteVersion(
                                            version.id,
                                            version.file_path
                                          )
                                        }
                                        className="rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-50"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {!submission && (
                              <button
                                onClick={() => handleSubmitTask(task.id)}
                                className="mt-4 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90"
                              >
                                Submit Task
                              </button>
                            )}

                            {submission && (
                              <div className="mt-4 rounded-2xl border border-green-300 bg-green-50 p-3 text-sm font-semibold text-green-700">
                                Task submitted successfully.
                              </div>
                            )}
                          </div>
                        )}

                      {task.status === 'submitted' && (
                        <div className="mt-4 rounded-2xl border border-gray-400 bg-gray-50 p-3 text-sm text-gray-700">
                          This task has already been submitted.
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <SectionHeader title="Project Activity" />

          {activityLogs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
              No activity yet.
            </div>
          ) : (
            <div className="space-y-2">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4"
                >
                  <p className="break-words font-semibold text-gray-900">
                    {log.description}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-gray-400 bg-white shadow-2xl">
            <div className="flex shrink-0 flex-col gap-4 border-b border-gray-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
<h2 className="mt-1 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-3xl font-black text-transparent">
  Create Tasks
</h2>

                <p className="mt-1 text-sm text-gray-500">
                  Create manual tasks and generate AI tasks for your group.
                </p>
              </div>

              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {!isCompleted && (
                <>
                  <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
<div>
  <h2 className="text-2xl font-black text-black">
    Create Manual Task
  </h2>

  <p className="mt-1 text-sm text-gray-600">
    Students can manually create tasks.
  </p>
</div>

                    <form
                      onSubmit={handleCreateManualTask}
                      className="space-y-3"
                    >
                      <input
                        name="title"
                        value={taskForm.title}
                        onChange={handleTaskFormChange}
                        placeholder="Task title"
                        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                        required
                      />

                      <textarea
                        name="description"
                        value={taskForm.description}
                        onChange={handleTaskFormChange}
                        placeholder="Task description"
                        className="min-h-24 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                      />

                      <select
                        name="priority"
                        value={taskForm.priority}
                        onChange={handleTaskFormChange}
                        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>

                      <input
                        name="dueDate"
                        type="datetime-local"
                        value={taskForm.dueDate}
                        onChange={handleTaskFormChange}
                        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                      />

                      <button className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90">
                        Create Task
                      </button>
                    </form>
                  </div>

                  <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
<div>
  <h2 className="text-2xl font-black text-black">
    Generate AI Tasks
  </h2>

  <p className="mt-1 text-sm text-gray-600">
    Upload planning files that AI will analyze later.
  </p>
</div>

                    <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6">
                      <div className="flex flex-col gap-4">
                        <div>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={(e) =>
                              handleUploadAiFile(e.target.files[0])
                            }
                            disabled={uploadingAiFile}
                          />

                          <p className="mt-2 text-xs text-gray-500">
                            Allowed: PDF, DOC, DOCX, TXT
                          </p>
                        </div>

                        {uploadingAiFile && (
                          <p className="text-sm text-gray-500">
                            Uploading AI planning file...
                          </p>
                        )}

{aiFiles.length === 0 ? (
  <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500">
    No uploaded planning files yet.
  </div>
) : (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {aiFiles.map((file) => (
      <div
        key={file.id}
        className="rounded-2xl border border-gray-300 bg-white p-3 shadow-sm"
      >
        <p className="line-clamp-2 break-all text-sm font-black text-gray-900">
          {file.file_name}
        </p>

        <p className="mt-1 text-xs capitalize text-gray-500">
          {file.status}
        </p>

        <button
          onClick={() => handleDeleteAiFile(file.id, file.file_path)}
          className="mt-3 h-9 w-full rounded-xl border border-red-300 bg-white text-xs font-semibold text-red-600 transition-all hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    ))}
  </div>
)}

                        <button
                          onClick={handleGenerateAiTasks}
                          disabled={
                            generatingAiTasks ||
                            aiFiles.length === 0 ||
                            isCompleted
                          }
                          className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {generatingAiTasks
                            ? 'Generating AI Tasks...'
                            : tasks.some((task) => task.source === 'ai')
                              ? 'Generate More AI Tasks'
                              : 'Generate AI Tasks'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isChatOpen && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[560px] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-gray-400 bg-white shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-300 px-4 py-3">
            <div>
              <h2 className="font-black text-gray-900">Group Chat</h2>
              <p className="text-xs text-gray-500">
                {myGroup?.group_name || 'Your group'}
              </p>
            </div>

            <button
              onClick={() => setIsChatOpen(false)}
              className="rounded-xl border border-[#00CFC8]/40 bg-white px-3 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
            {groupMessages.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                No messages yet. Start the conversation.
              </div>
            ) : (
              groupMessages.map((chat) => {
                const isMine = chat.sender_id === currentUser?.id
                const senderName = `${chat.profiles?.first_name || ''} ${
                  chat.profiles?.last_name || ''
                }`.trim()

                return (
                  <div
                    key={chat.id}
                    className={`flex ${
                      isMine ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] break-words rounded-2xl px-3 py-2 text-sm ${
                        isMine
                          ? 'bg-gradient-to-r from-cyan-400 to-green-400 text-black'
                          : 'border border-gray-300 bg-white text-gray-900'
                      }`}
                    >
                      {!isMine && (
                        <p className="mb-1 text-xs font-bold">
                          {senderName || 'Groupmate'}
                        </p>
                      )}

                      <p className="whitespace-pre-wrap">{chat.message}</p>

                      <p
                        className={`mt-1 text-[10px] ${
                          isMine ? 'text-black/60' : 'text-gray-500'
                        }`}
                      >
                        {new Date(chat.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })
            )}

            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSendGroupMessage}
            className="flex shrink-0 gap-2 border-t border-gray-300 p-3"
          >
            <input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-xl border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
            />

            <button
              disabled={sendingMessage || !chatMessage.trim()}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-4 py-2 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingMessage ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      )}

      {reassignmentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-400 bg-white p-6 shadow-2xl">
            <p className="bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-sm font-semibold uppercase tracking-[0.2em] text-transparent">
              Request
            </p>

            <h2 className="mt-1 text-2xl font-black text-gray-900">
              Request Reassignment
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Your teacher will review this request. The task will remain assigned to you until approved.
            </p>

            <form onSubmit={handleSubmitReassignment} className="mt-5 space-y-4">
              <select
                name="requestedTo"
                value={reassignmentForm.requestedTo}
                onChange={handleReassignmentChange}
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                required
              >
                <option value="">Select group member</option>

                {groupMembers
                  .filter((member) => member.student_id !== currentUser?.id)
                  .map((member) => (
                    <option key={member.student_id} value={member.student_id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
              </select>

              <textarea
                name="reason"
                value={reassignmentForm.reason}
                onChange={handleReassignmentChange}
                placeholder="Reason for reassignment"
                className="min-h-28 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                required
              />

              <div className="rounded-2xl border border-gray-400 bg-gray-50 p-3 text-sm text-gray-700">
                Your teacher will review this request. The task will remain assigned to you until approved.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90">
                  Submit Request
                </button>

                <button
                  type="button"
                  onClick={closeReassignmentModal}
                  className="rounded-xl border border-[#00CFC8]/40 bg-white px-5 py-3 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {claimModal.isOpen && claimModal.task && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-400 bg-white p-6 shadow-2xl">
            <p className="bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-sm font-semibold uppercase tracking-[0.2em] text-transparent">
              Claim Task
            </p>

            <h2 className="mt-1 text-2xl font-black text-gray-900">
              Claim Task?
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Confirm that you want to claim this task.
            </p>

            <div className="my-4 rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
              <p className="font-black text-gray-900">
                {claimModal.task.title}
              </p>

              <p className="mt-1 break-words text-sm text-gray-600">
                {claimModal.task.description || 'No description.'}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <p>
                  <span className="font-semibold">Priority:</span>{' '}
                  {claimModal.task.priority}
                </p>

                <p>
                  <span className="font-semibold">Difficulty:</span>{' '}
                  {claimModal.task.difficulty || 'medium'}
                </p>

                <p>
                  <span className="font-semibold">Category:</span>{' '}
                  {claimModal.task.category || 'general'}
                </p>
              </div>
            </div>

            {getRecommendedMemberForTask() && (
              <div className="mb-4 rounded-2xl border border-gray-400 bg-gray-50 p-3 text-sm">
                <p className="font-black text-gray-900">
                  Recommended claimant
                </p>

                <p className="text-gray-700">
                  {getRecommendedMemberForTask().first_name}{' '}
                  {getRecommendedMemberForTask().last_name}
                </p>

                <p className="text-gray-500">
                  Based on the lowest active workload.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => handleClaimTask(claimModal.task.id)}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90"
              >
                Confirm Claim
              </button>

              <button
                type="button"
                onClick={closeClaimModal}
                className="rounded-xl border border-[#00CFC8]/40 bg-white px-5 py-3 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default StudentProjectDetailsPage