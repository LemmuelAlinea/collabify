import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import { generalManagerNavigation } from '../config/generalNavigation'

function GeneralManagerProjectDetailsPage() {
  const { projectId } = useParams()

  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false)
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  const [sponsorSearch, setSponsorSearch] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [sponsorResults, setSponsorResults] = useState([])
  const [memberResults, setMemberResults] = useState([])

  const [searchingSponsor, setSearchingSponsor] = useState(false)
  const [searchingMember, setSearchingMember] = useState(false)
  const [submissionsMap, setSubmissionsMap] = useState({})

  const [assigningSponsor, setAssigningSponsor] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    status: 'todo',
    category: 'general',
    difficulty: 'medium',
    dueDate: '',
  })

  useEffect(() => {
    fetchProjectDetails()
  }, [projectId])

  function handleTaskFormChange(e) {
    setTaskForm({
      ...taskForm,
      [e.target.name]: e.target.value,
    })
  }

  async function handleCreateTask(e) {
    e.preventDefault()
    setCreatingTask(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('User not found.')
      setCreatingTask(false)
      return
    }

    const { data: task, error } = await supabase
      .from('general_tasks')
      .insert({
        project_id: projectId,
        assigned_to: taskForm.assignedTo || null,
        created_by: user.id,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        status: taskForm.status,
        category: taskForm.category,
        difficulty: taskForm.difficulty,
        due_date: taskForm.dueDate || null,
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      setCreatingTask(false)
      return
    }

    await supabase.from('general_activity_logs').insert({
      project_id: projectId,
      task_id: task.id,
      user_id: user.id,
      activity_type: 'task_created',
      description: `Task "${taskForm.title}" was created.`,
    })

    setTaskForm({
      title: '',
      description: '',
      assignedTo: '',
      priority: 'medium',
      status: 'todo',
      category: 'general',
      difficulty: 'medium',
      dueDate: '',
    })

    setCreatingTask(false)
    setIsTaskModalOpen(false)

    await fetchProjectDetails()
  }

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

  async function fetchProjectDetails() {
    setLoading(true)
    setMessage('')

    const { data: projectData, error: projectError } = await supabase
      .from('general_projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError) {
      setMessage(projectError.message)
      setLoading(false)
      return
    }

    if (!projectData) {
      setMessage('Project not found.')
      setLoading(false)
      return
    }

    let sponsorData = null
    let managerData = null

    if (projectData.project_sponsor_id) {
      const { data } = await supabase.rpc('get_general_project_sponsor', {
        project_uuid: projectId,
      })

      sponsorData = data?.[0] || null
    }

    if (projectData.project_manager_id) {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', projectData.project_manager_id)
        .maybeSingle()

      managerData = data || null
    }

    projectData.sponsor = sponsorData
    projectData.manager = managerData

    const { data: memberRows } = await supabase.rpc(
      'get_general_project_members',
      {
        project_uuid: projectId,
      }
    )

    const { data: taskRows } = await supabase.rpc(
      'get_general_project_tasks',
      {
        project_uuid: projectId,
      }
    )

    const { data: activityRows } = await supabase
      .from('general_activity_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20)

    setProject(projectData)
    setMembers(memberRows || [])
    setTasks(taskRows || [])
    setActivities(activityRows || [])

    await fetchTaskSubmissions((taskRows || []).map((task) => task.id))

    setLoading(false)
  }

  async function searchSponsors(value) {
    setSponsorSearch(value)
    setSponsorResults([])

    if (!value.trim()) return

    setSearchingSponsor(true)

    const { data, error } = await supabase.rpc('search_general_users', {
      search_text: value.trim(),
      target_role: 'project_sponsor',
    })

    if (error) {
      setMessage(error.message)
      setSearchingSponsor(false)
      return
    }

    setSponsorResults(data || [])
    setSearchingSponsor(false)
  }

  async function searchMembers(value) {
    setMemberSearch(value)
    setMemberResults([])

    if (!value.trim()) return

    setSearchingMember(true)

    const { data, error } = await supabase.rpc('search_general_users', {
      search_text: value.trim(),
      target_role: 'project_member',
    })

    if (error) {
      setMessage(error.message)
      setSearchingMember(false)
      return
    }

    setMemberResults(data || [])
    setSearchingMember(false)
  }

  async function handleAssignSponsor(sponsor) {
    setAssigningSponsor(true)
    setMessage('')

    const { error } = await supabase
      .from('general_projects')
      .update({
        project_sponsor_id: sponsor.id,
      })
      .eq('id', projectId)

    if (error) {
      setMessage(error.message)
      setAssigningSponsor(false)
      return
    }

    const sponsorName = `${sponsor.first_name || ''} ${
      sponsor.last_name || ''
    }`.trim()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('general_activity_logs').insert({
      project_id: projectId,
      user_id: user?.id || null,
      activity_type: 'sponsor_assigned',
      description: `${
        sponsorName || sponsor.email
      } was assigned as project sponsor.`,
    })

    setSponsorSearch('')
    setSponsorResults([])
    setAssigningSponsor(false)
    setIsSponsorModalOpen(false)

    await fetchProjectDetails()
  }

  async function handleAddMember(member) {
    setAddingMember(true)
    setMessage('')

    const { error } = await supabase.from('general_project_members').insert({
      project_id: projectId,
      member_id: member.id,
      role: 'member',
    })

    if (error) {
      if (error.code === '23505') {
        setMessage('This member is already added to this project.')
      } else {
        setMessage(error.message)
      }

      setAddingMember(false)
      return
    }

    const memberName = `${member.first_name || ''} ${
      member.last_name || ''
    }`.trim()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('general_activity_logs').insert({
      project_id: projectId,
      user_id: user?.id || null,
      activity_type: 'member_added',
      description: `${memberName || member.email} was added to the project.`,
    })

    setMemberSearch('')
    setMemberResults([])
    setAddingMember(false)
    setIsMemberModalOpen(false)

    await fetchProjectDetails()
  }

  async function handleRequestSponsorApproval(task) {
    setMessage('')

    if (!project?.project_sponsor_id) {
      setMessage('Assign a sponsor before requesting approval.')
      return
    }

    if (task.status !== 'completed' && task.status !== 'submitted') {
      setMessage('Only completed tasks can be sent for sponsor approval.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('User not found.')
      return
    }

    const { error } = await supabase
      .from('general_tasks')
      .update({
        sponsor_approval_required: true,
        sponsor_approval_status: 'pending',
        sponsor_approval_requested_at: new Date().toISOString(),
        sponsor_approval_requested_by: user.id,
        sponsor_approval_comment: null,
      })
      .eq('id', task.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase.from('general_activity_logs').insert({
      project_id: projectId,
      task_id: task.id,
      user_id: user.id,
      activity_type: 'sponsor_task_approval_requested',
      description: `Task "${task.title}" was sent to the sponsor for approval.`,
    })

    setMessage('Task approval request sent to sponsor.')
    await fetchProjectDetails()
  }

  const pendingTasks = tasks.filter(
    (task) => task.status !== 'completed' && task.status !== 'submitted'
  )

  if (loading) {
    return (
      <DashboardLayout
        title="Collabify"
        pageTitle="Project Details"
        navigation={generalManagerNavigation}
      >
        <p className="text-gray-500">Loading project details...</p>
      </DashboardLayout>
    )
  }

  if (!project) {
    return (
      <DashboardLayout
        title="Collabify"
        pageTitle="Project Details"
        navigation={generalManagerNavigation}
      >
        <p className="text-gray-500">{message || 'Project not found.'}</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Project Details"
      navigation={generalManagerNavigation}
    >
      <div className="space-y-6 text-gray-900">
<div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
  <div>
    <Link
      to="/general/manager/projects"
      className="text-sm font-semibold text-[#00CFC8] hover:underline"
    >
      Back to Projects
    </Link>

    <h1 className="mt-3 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
      {project.title}
    </h1>

    <p className="mt-2 max-w-3xl text-gray-500">
      {project.description || 'No description provided.'}
    </p>
  </div>

  <div className="flex flex-wrap items-center gap-3">
    <Link
      to={`/general/manager/projects/${projectId}/chat`}
      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-black text-white shadow-lg transition-all hover:scale-[1.02] hover:opacity-90"
    >
      Open Chat
    </Link>

    <button
      onClick={() => setIsSponsorModalOpen(true)}
      className="cursor-pointer rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700 shadow-sm transition-all hover:bg-amber-100"
    >
      Add Sponsor
    </button>

    <button
      onClick={() => setIsMemberModalOpen(true)}
      className="cursor-pointer rounded-xl border border-blue-300 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 shadow-sm transition-all hover:bg-blue-100"
    >
      Add Member
    </button>

    <button
      onClick={() => setIsTaskModalOpen(true)}
      className="cursor-pointer rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black shadow-lg transition-all hover:scale-[1.02] hover:opacity-90"
    >
      Create Task
    </button>
  </div>
</div>

        {message && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
          <Card title="Status" value={project.status} description="Current project state" />
          <Card title="Priority" value={project.priority} description="Project urgency" />
          <Card title="Members" value={members.length} description="Assigned team members" />
          <Card title="Tasks" value={tasks.length} description="Total project tasks" />
          <Card title="Pending" value={pendingTasks.length} description="Unfinished tasks" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm xl:col-span-2">
            <SectionHeader
              title="Project Information"
              description="Main details and expected outcomes."
            />

            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-400">Project Type</p>
                <p className="mt-1 font-bold text-gray-900">
                  {project.project_type}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-400">Start Date</p>
                <p className="mt-1 font-bold text-gray-900">
                  {project.start_date
                    ? new Date(project.start_date).toLocaleString()
                    : 'Not set'}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-400">Deadline</p>
                <p className="mt-1 font-bold text-gray-900">
                  {project.deadline
                    ? new Date(project.deadline).toLocaleString()
                    : 'Not set'}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-400">Sponsor</p>
                <p className="mt-1 font-bold text-gray-900">
                  {project.sponsor
                    ? `${project.sponsor.first_name || ''} ${
                        project.sponsor.last_name || ''
                      }`.trim()
                    : 'No sponsor assigned'}
                </p>

                {project.sponsor?.email && (
                  <p className="mt-1 text-gray-500">
                    {project.sponsor.email}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="font-semibold text-gray-400">Objectives</p>
                <p className="mt-2 whitespace-pre-wrap text-gray-600">
                  {project.objectives || 'No objectives provided.'}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="font-semibold text-gray-400">Expected Output</p>
                <p className="mt-2 whitespace-pre-wrap text-gray-600">
                  {project.expected_output || 'No expected output provided.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Activity Feed"
              description="Recent updates in this project."
            />

            {activities.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
                No activity yet.
              </div>
            ) : (
              <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <p className="text-sm font-semibold text-gray-900">
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Project Members"
              description="Members assigned to this general project."
            />

            {members.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
                No members assigned yet.
              </div>
            ) : (
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div>
                      <p className="font-bold text-gray-900">
                        {member.first_name} {member.last_name}
                      </p>

                      <p className="text-sm text-gray-500">
                        {member.email}
                      </p>
                    </div>

                    <span className="rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold text-[#00CFC8]">
                      {member.project_role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

<div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
  <SectionHeader
    title="Project Tasks"
    description="Tasks created for this project."
  />

  {tasks.length === 0 ? (
    <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
      No tasks created yet.
    </div>
  ) : (
    <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
      {tasks.map((task) => {
        const assignedName = task.assigned_to
          ? `${task.assigned_first_name || ''} ${
              task.assigned_last_name || ''
            }`.trim() ||
            task.assigned_email ||
            'Assigned member'
          : 'Unassigned'

        return (
          <div
            key={task.id}
            className="rounded-2xl border border-[#D6E4FF] bg-[#cad7ec] p-5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-gray-900">
                  {task.title}
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  {task.description || 'No description.'}
                </p>
              </div>

              <span className="rounded-full border border-[#00CFC8]/30 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0] shadow-sm">
                {task.sponsor_approval_status === 'revision_requested'
                  ? 'revision_requested'
                  : task.sponsor_approval_status === 'pending'
                    ? 'pending_sponsor_approval'
                    : task.sponsor_approval_status === 'approved'
                      ? 'sponsor_approved'
                      : task.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <p className="text-gray-500">Assigned</p>

                <p className="font-semibold text-gray-900">
                  {assignedName}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <p className="text-gray-500">Priority</p>

                <p className="font-semibold capitalize text-gray-900">
                  {task.priority}
                </p>
              </div>
            </div>

            {(submissionsMap[task.id] || []).length > 0 && (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="mb-3 font-black text-[#00CFC8]">
                  Submitted Work
                </p>

                <div className="space-y-3">
                  {(submissionsMap[task.id] || []).map((submission) => (
                    <div
                      key={submission.id}
                      className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-3 text-sm"
                    >
                      {submission.submission_type === 'text' ? (
                        <p className="break-words whitespace-pre-wrap text-gray-700">
                          {submission.content}
                        </p>
                      ) : (
                        <a
                          href={submission.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#00CFC8] hover:underline"
                        >
                          {submission.file_name || 'Open uploaded file'}
                        </a>
                      )}

                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(submission.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {task.sponsor_approval_status && (
              <div
                className={`mt-3 rounded-xl border p-3 text-sm ${
                  task.sponsor_approval_status === 'revision_requested'
                    ? 'border-yellow-300 bg-yellow-100'
                    : task.sponsor_approval_status === 'approved'
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 bg-white'
                }`}
              >
                <p className="font-semibold text-[#00CFC8]">
                  Sponsor Approval: {task.sponsor_approval_status}
                </p>

                {task.sponsor_approval_comment && (
                  <p className="mt-2 text-gray-700">
                    Sponsor Comment: {task.sponsor_approval_comment}
                  </p>
                )}
              </div>
            )}

<div className="mt-4 flex flex-wrap items-center gap-3">
  {(task.status === 'completed' ||
    task.status === 'submitted') &&
    project?.project_sponsor_id &&
    task.sponsor_approval_status !== 'pending' &&
    task.sponsor_approval_status !== 'approved' && (
      <button
        onClick={() => handleRequestSponsorApproval(task)}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 text-sm font-black text-black transition-all hover:scale-105 hover:shadow-lg hover:opacity-90"
      >
        Request Sponsor Approval
      </button>
    )}

  <Link
    to={`/general/manager/projects/${projectId}/tasks/${task.id}`}
    className="inline-flex h-11 items-center justify-center rounded-xl border border-[#00CFC8]/40 bg-white px-5 text-sm font-semibold text-[#00CFC8] transition-all hover:scale-105 hover:bg-gray-50 hover:shadow-md"
  >
    Open Task
  </Link>
</div>
          </div>
        )
      })}
    </div>
  )}
</div>
        </div>
      </div>

      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white text-gray-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-6">
              <div>
                <p className="bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text font-semibold uppercase tracking-widest text-transparent">
                  Task Management
                </p>

                <h2 className="mt-1 text-3xl font-black text-gray-900">
                  Create Project Task
                </h2>

                <p className="mt-1 text-gray-500">
                  Assign a task to a general project member.
                </p>
              </div>

              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="rounded-xl border border-[#00CFC8]/40 bg-white px-3 py-2 font-semibold text-[#00CFC8] hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={handleCreateTask}
              className="flex-1 space-y-4 overflow-y-auto p-6"
            >
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-600">
                  Task Title
                </label>

                <input
                  name="title"
                  value={taskForm.title}
                  onChange={handleTaskFormChange}
                  placeholder="Example: Prepare project proposal"
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-600">
                  Description
                </label>

                <textarea
                  name="description"
                  value={taskForm.description}
                  onChange={handleTaskFormChange}
                  placeholder="Describe the task instructions."
                  className="min-h-28 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-600">
                  Assign To
                </label>

                <select
                  name="assignedTo"
                  value={taskForm.assignedTo}
                  onChange={handleTaskFormChange}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                >
                  <option value="">Unassigned</option>

                  {members.map((member) => (
                    <option key={member.member_id} value={member.member_id}>
                      {member.first_name} {member.last_name} — {member.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-600">
                    Priority
                  </label>

                  <select
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleTaskFormChange}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-600">
                    Status
                  </label>

                  <select
                    name="status"
                    value={taskForm.status}
                    onChange={handleTaskFormChange}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-600">
                    Difficulty
                  </label>

                  <select
                    name="difficulty"
                    value={taskForm.difficulty}
                    onChange={handleTaskFormChange}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-600">
                  Category
                </label>

                <input
                  name="category"
                  value={taskForm.category}
                  onChange={handleTaskFormChange}
                  placeholder="Example: documentation, design, development"
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-600">
                  Due Date
                </label>

                <input
                  name="dueDate"
                  type="datetime-local"
                  value={taskForm.dueDate}
                  onChange={handleTaskFormChange}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  disabled={creatingTask}
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 font-black text-black disabled:opacity-50"
                >
                  {creatingTask ? 'Creating...' : 'Create Task'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="rounded-xl border border-[#00CFC8]/40 bg-white px-5 py-3 font-semibold text-[#00CFC8] hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSponsorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text font-semibold uppercase tracking-widest text-transparent">
                  Project Sponsor
                </p>

                <h2 className="mt-1 text-3xl font-black text-gray-900">
                  Add Sponsor
                </h2>

                <p className="mt-1 text-gray-500">
                  Search for a registered project sponsor by name or email.
                </p>
              </div>

              <button
                onClick={() => setIsSponsorModalOpen(false)}
                className="rounded-xl border border-[#00CFC8]/40 bg-white px-3 py-2 font-semibold text-[#00CFC8] hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <input
              value={sponsorSearch}
              onChange={(e) => searchSponsors(e.target.value)}
              placeholder="Search sponsor name or email..."
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
            />

            <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto">
              {searchingSponsor && (
                <p className="text-sm text-gray-500">Searching sponsors...</p>
              )}

              {!searchingSponsor &&
                sponsorSearch &&
                sponsorResults.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-center text-gray-500">
                    No sponsors found.
                  </div>
                )}

              {sponsorResults.map((sponsor) => {
                const sponsorName = `${sponsor.first_name || ''} ${
                  sponsor.last_name || ''
                }`.trim()

                return (
                  <div
                    key={sponsor.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div>
                      <p className="font-bold text-gray-900">
                        {sponsorName || 'Unnamed Sponsor'}
                      </p>

                      <p className="text-sm text-gray-500">
                        {sponsor.email}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAssignSponsor(sponsor)}
                      disabled={assigningSponsor}
                      className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-4 py-2 text-sm font-black text-black disabled:opacity-50"
                    >
                      {assigningSponsor ? 'Assigning...' : 'Assign'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text font-semibold uppercase tracking-widest text-transparent">
                  Project Member
                </p>

                <h2 className="mt-1 text-3xl font-black text-gray-900">
                  Add Member
                </h2>

                <p className="mt-1 text-gray-500">
                  Search for a registered project member by name or email.
                </p>
              </div>

              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="rounded-xl border border-[#00CFC8]/40 bg-white px-3 py-2 font-semibold text-[#00CFC8] hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <input
              value={memberSearch}
              onChange={(e) => searchMembers(e.target.value)}
              placeholder="Search member name or email..."
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
            />

            <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto">
              {searchingMember && (
                <p className="text-sm text-gray-500">Searching members...</p>
              )}

              {!searchingMember &&
                memberSearch &&
                memberResults.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-center text-gray-500">
                    No members found.
                  </div>
                )}

              {memberResults.map((member) => {
                const memberName = `${member.first_name || ''} ${
                  member.last_name || ''
                }`.trim()

                const alreadyAdded = members.some(
                  (item) => item.member_id === member.id
                )

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div>
                      <p className="font-bold text-gray-900">
                        {memberName || 'Unnamed Member'}
                      </p>

                      <p className="text-sm text-gray-500">
                        {member.email}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAddMember(member)}
                      disabled={addingMember || alreadyAdded}
                      className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-4 py-2 text-sm font-black text-black disabled:opacity-50"
                    >
                      {alreadyAdded
                        ? 'Added'
                        : addingMember
                          ? 'Adding...'
                          : 'Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default GeneralManagerProjectDetailsPage