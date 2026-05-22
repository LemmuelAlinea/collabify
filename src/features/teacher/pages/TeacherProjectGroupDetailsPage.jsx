import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'

function TeacherProjectGroupDetailsPage() {
  const { projectId, groupId } = useParams()

  const [project, setProject] = useState(null)
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchGroupDetails()
  }, [projectId, groupId])

  async function fetchAssigneeName(userId) {
    if (!userId) return 'Unassigned'

    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .maybeSingle()

    if (!data) return 'Unknown Student'

    return (
      `${data.first_name || ''} ${data.last_name || ''}`.trim() ||
      data.email ||
      'Unknown Student'
    )
  }

  async function fetchGroupDetails() {
    setLoading(true)
    setMessage('')

    if (!projectId || !groupId) {
      setMessage('Missing project or group ID.')
      setLoading(false)
      return
    }

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError) {
      setMessage(projectError.message)
      setLoading(false)
      return
    }

    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle()

    if (groupError) {
      setMessage(groupError.message)
      setLoading(false)
      return
    }

    const { data: memberRows, error: memberError } = await supabase.rpc(
      'get_group_members',
      {
        group_uuid: groupId,
      }
    )

    if (memberError) {
      setMessage(memberError.message)
      setLoading(false)
      return
    }

    const { data: taskRows, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (taskError) {
      setMessage(taskError.message)
      setLoading(false)
      return
    }

    const tasksWithNames = await Promise.all(
      (taskRows || []).map(async (task) => ({
        ...task,
        assigneeName: await fetchAssigneeName(task.assigned_to),
      }))
    )

    const { data: logs } = await supabase
      .from('project_activity_logs')
      .select('*')
      .eq('project_id', projectId)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(30)

    setProject(projectData)
    setGroup(groupData)
    setMembers(memberRows || [])
    setTasks(tasksWithNames)
    setActivityLogs(logs || [])
    setLoading(false)
  }

  function formatDateTime(value) {
    if (!value) return 'N/A'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return 'Invalid date'

    return date.toLocaleString()
  }

  const submittedTasks = tasks.filter(
    (task) => task.status === 'submitted' || task.status === 'completed'
  )

  const activeTasks = tasks.filter(
    (task) => task.status !== 'submitted' && task.status !== 'completed'
  )

  if (loading) {
    return (
      <DashboardLayout
        title="Teacher Panel"
        pageTitle="Group Details"
        navigation={teacherNavigation}
      >
        <p className="text-gray-500">Loading group details...</p>
      </DashboardLayout>
    )
  }

  if (!project || !group) {
    return (
      <DashboardLayout
        title="Teacher Panel"
        pageTitle="Group Details"
        navigation={teacherNavigation}
      >
        <p className="text-gray-500">
          {message || 'Project group details not found.'}
        </p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Teacher Panel"
      pageTitle="Group Details"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <Link
            to={`/teacher/projects/${projectId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
          >
            <ChevronLeft size={18} />
            Back to Project
          </Link>

          <h1 className="mt-3 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            {group.group_name}
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">{project.title}</p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card title="Members" value={members.length} description="Group members" />
          <Card title="Tasks" value={tasks.length} description="Group tasks" />
          <Card title="Active" value={activeTasks.length} description="Unfinished tasks" />
          <Card
            title="Submitted"
            value={`${submittedTasks.length}/${tasks.length}`}
            description="Submitted or completed"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm xl:col-span-2">
            <SectionHeader
              title="Group Tasks"
              description="Tasks inside this project and opened group."
            />

            {tasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
                This group has no tasks for this project yet.
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="break-words text-xl font-black text-gray-900">
                          {task.title}
                        </h3>

                        <p className="mt-1 line-clamp-2 break-words text-sm text-gray-600">
                          {task.description || 'No description.'}
                        </p>
                      </div>

                      <span className="w-fit rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold capitalize text-[#00B8B0]">
                        {String(task.status || '').replaceAll('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                      <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                        <p className="text-gray-500">Assigned To</p>
                        <p className="font-bold text-gray-900">
                          {task.assigneeName}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                        <p className="text-gray-500">Priority</p>
                        <p className="font-bold capitalize text-gray-900">
                          {task.priority || 'medium'}
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
                        <p className="font-bold capitalize text-gray-900">
                          {task.difficulty || 'medium'}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/teacher/tasks/${task.id}`}
                      className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border border-[#00CFC8]/40 bg-white px-5 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                    >
                      Open Task
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader title="Group Members" description="Students inside this group." />

              {members.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                  No members found.
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.member_id}
                      className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4"
                    >
                      <p className="font-black text-gray-900">
                        {member.first_name} {member.last_name}
                      </p>

                      <p className="mt-1 break-all text-sm text-gray-600">
                        {member.email}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Group Activity"
                description="Recent project activity from this group."
              />

              {activityLogs.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                  No activity yet.
                </div>
              ) : (
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4"
                    >
                      <p className="break-words text-sm font-semibold text-gray-900">
                        {log.description}
                      </p>

                      <p className="mt-2 text-xs text-gray-500">
                        {formatDateTime(log.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default TeacherProjectGroupDetailsPage