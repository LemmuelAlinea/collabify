import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { studentNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { getProjectTypeLabel } from '../../../config/projectTypes'

function StudentClassDetailsPage() {
  const { classId } = useParams()

  const [classData, setClassData] = useState(null)
  const [teacherName, setTeacherName] = useState('N/A')
  const [myGroup, setMyGroup] = useState(null)
  const [myGroupMembers, setMyGroupMembers] = useState([])
  const [studentGroups, setStudentGroups] = useState([])
  const [projects, setProjects] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [joiningGroupId, setJoiningGroupId] = useState('')
  const [leavingGroup, setLeavingGroup] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchClassDetails()
  }, [classId])

  async function fetchTeacherName(teacherId) {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', teacherId)
      .maybeSingle()

    if (!data) return 'N/A'

    return `${data.first_name || ''} ${data.last_name || ''}`.trim()
  }

  async function fetchClassDetails() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('User not found.')
      setLoading(false)
      return
    }

    setCurrentUser(user)

    const { data: classInfo, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single()

    if (classError) {
      setMessage(classError.message)
      setLoading(false)
      return
    }

    const name = await fetchTeacherName(classInfo.teacher_id)

    const { data: studentGroup } = await supabase.rpc(
      'get_student_group_in_class',
      {
        class_uuid: classId,
        student_uuid: user.id,
      }
    )

    const assignedGroup = studentGroup?.[0] || null

    let groupMembers = []

    if (assignedGroup) {
      const { data } = await supabase.rpc('get_group_members', {
        group_uuid: assignedGroup.group_id,
      })

      groupMembers = data || []
    }

    const { data: groupRows } = await supabase
      .from('groups')
      .select('*')
      .eq('class_id', classId)
      .eq('grouping_method', 'student')
      .order('created_at', { ascending: true })

    const groupsWithMembers = await Promise.all(
      (groupRows || []).map(async (group) => {
        const { data: members } = await supabase.rpc('get_group_members', {
          group_uuid: group.id,
        })

        return {
          ...group,
          members: members || [],
        }
      })
    )

    const { data: projectRows } = await supabase
      .from('projects')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })

    setClassData(classInfo)
    setTeacherName(name)
    setMyGroup(assignedGroup)
    setMyGroupMembers(groupMembers)
    setStudentGroups(groupsWithMembers)
    setProjects(projectRows || [])
    setLoading(false)
  }

  async function handleCreateStudentGroup(e) {
    e.preventDefault()
    setMessage('')
    setCreatingGroup(true)

    if (!newGroupName.trim()) {
      setMessage('Group name is required.')
      setCreatingGroup(false)
      return
    }

    if (!classData.student_grouping_open || classData.student_grouping_locked) {
      setMessage('Student group formation is currently closed.')
      setCreatingGroup(false)
      return
    }

    if (myGroup) {
      setMessage('You already belong to a group in this class.')
      setCreatingGroup(false)
      return
    }

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        class_id: classId,
        group_name: newGroupName.trim(),
        grouping_method: 'student',
      })
      .select()
      .single()

    if (groupError) {
      setMessage(groupError.message)
      setCreatingGroup(false)
      return
    }

    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: group.id,
      student_id: currentUser.id,
    })

    if (memberError) {
      setMessage(memberError.message)
      setCreatingGroup(false)
      return
    }

    setNewGroupName('')
    setCreatingGroup(false)
    setMessage('Group created successfully.')
    await fetchClassDetails()
  }

  async function handleJoinGroup(group) {
    setMessage('')
    setJoiningGroupId(group.id)

    if (!classData.student_grouping_open || classData.student_grouping_locked) {
      setMessage('Student group formation is currently closed.')
      setJoiningGroupId('')
      return
    }

    if (myGroup) {
      setMessage('You already belong to a group in this class.')
      setJoiningGroupId('')
      return
    }

    const maxMembers = Number(classData.student_group_size || 4)

    if ((group.members || []).length >= maxMembers) {
      setMessage('This group is already full.')
      setJoiningGroupId('')
      return
    }

    const { error } = await supabase.from('group_members').insert({
      group_id: group.id,
      student_id: currentUser.id,
    })

    if (error) {
      setMessage(
        error.code === '23505'
          ? 'You are already in this group.'
          : error.message
      )
      setJoiningGroupId('')
      return
    }

    setJoiningGroupId('')
    setMessage('You joined the group successfully.')
    await fetchClassDetails()
  }

  async function handleLeaveGroup() {
    setMessage('')
    setLeavingGroup(true)

    if (!myGroup) {
      setMessage('You are not currently in a group.')
      setLeavingGroup(false)
      return
    }

    if (!classData.student_grouping_open || classData.student_grouping_locked) {
      setMessage('You cannot leave because group formation is closed.')
      setLeavingGroup(false)
      return
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', myGroup.group_id)
      .eq('student_id', currentUser.id)

    if (error) {
      setMessage(error.message)
      setLeavingGroup(false)
      return
    }

    setLeavingGroup(false)
    setMessage('You left the group successfully.')
    await fetchClassDetails()
  }

  const canUseStudentGrouping =
    classData?.student_grouping_open && !classData?.student_grouping_locked

  if (loading) {
    return (
      <DashboardLayout
        title="Collabify"
        pageTitle="Class Details"
        navigation={studentNavigation}
      >
        <p className="text-gray-500">Loading class details...</p>
      </DashboardLayout>
    )
  }

  if (!classData) {
    return (
      <DashboardLayout
        title="Collabify"
        pageTitle="Class Details"
        navigation={studentNavigation}
      >
        <p className="text-gray-500">Class not found.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Class Details"
      navigation={studentNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>
          <Link
            to="/student/classes"
            className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
          >
            <ChevronLeft size={18} />
            Back to My Classes
          </Link>

          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            {classData.class_name}
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            {classData.section} • Professor {teacherName}
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card
            title="Semester"
            value={classData.semester}
            description={classData.academic_year}
          />

          <Card
            title="My Group"
            value={myGroup?.group_name || 'None'}
            description="Assigned group"
          />

          <Card
            title="Projects"
            value={projects.length}
            description="Assigned projects"
          />
        </div>

        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Student-Formed Groups"
            description="Create or join a group while your teacher has group formation open."
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
              <p className="text-sm text-gray-600">Formation Status</p>
              <p className="mt-1 text-xl font-black text-gray-900">
                {classData.student_grouping_locked
                  ? 'Locked'
                  : classData.student_grouping_open
                    ? 'Open'
                    : 'Closed'}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
              <p className="text-sm text-gray-600">Members Per Group</p>
              <p className="mt-1 text-xl font-black text-gray-900">
                {classData.student_group_size || 4}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
              <p className="text-sm text-gray-600">My Group</p>
              <p className="mt-1 text-xl font-black text-gray-900">
                {myGroup?.group_name || 'None'}
              </p>
            </div>
          </div>

          {canUseStudentGrouping && !myGroup && (
            <form
              onSubmit={handleCreateStudentGroup}
              className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3"
            >
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
                className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8] md:col-span-2"
              />

              <button
                disabled={creatingGroup}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-4 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
              >
                {creatingGroup ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          )}

          {myGroup && canUseStudentGrouping && (
            <button
              onClick={handleLeaveGroup}
              disabled={leavingGroup}
              className="mt-5 rounded-xl border border-red-300 bg-red-50 px-5 py-3 text-sm font-black text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
            >
              {leavingGroup ? 'Leaving...' : 'Leave My Group'}
            </button>
          )}

          <div className="mt-6">
            {studentGroups.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                No student-formed groups yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {studentGroups.map((group) => {
                  const maxMembers = Number(classData.student_group_size || 4)
                  const isFull = group.members.length >= maxMembers

                  return (
                    <div
                      key={group.id}
                      className="rounded-3xl border border-gray-400 bg-[#F8FBFF] p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black text-gray-900">
                            {group.group_name}
                          </h3>

                          <p className="mt-1 text-sm text-gray-600">
                            {group.members.length}/{maxMembers} members
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            isFull
                              ? 'border-red-300 bg-red-50 text-red-600'
                              : 'border-[#00CFC8]/40 bg-white text-[#00B8B0]'
                          }`}
                        >
                          {isFull ? 'Full' : 'Open'}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {group.members.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No members yet.
                          </p>
                        ) : (
                          group.members.map((member) => (
                            <div
                              key={member.member_id}
                              className="rounded-xl border border-gray-400 bg-[#EAF2FF] p-2 text-sm"
                            >
                              <p className="font-bold text-gray-900">
                                {member.first_name} {member.last_name}
                              </p>

                              <p className="break-all text-gray-600">
                                {member.email}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {canUseStudentGrouping && !myGroup && (
                        <button
                          onClick={() => handleJoinGroup(group)}
                          disabled={isFull || joiningGroupId === group.id}
                          className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-4 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                        >
                          {joiningGroupId === group.id
                            ? 'Joining...'
                            : isFull
                              ? 'Group Full'
                              : 'Join Group'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <SectionHeader
            title="My Group"
            description="This is your group for this class."
          />

          {!myGroup ? (
            <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
              You are not assigned to a group yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
                <h3 className="text-xl font-black text-gray-900">
                  {myGroup.group_name}
                </h3>

                <p className="mt-1 text-sm text-gray-600">
                  Method: {myGroup.grouping_method || 'manual'}
                </p>
              </div>

              {myGroupMembers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                  No group members found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {myGroupMembers.map((member) => (
                    <div
                      key={member.member_id}
                      className="rounded-2xl border border-gray-400 bg-white p-4 shadow-sm"
                    >
                      <p className="break-words font-black text-gray-900">
                        {member.first_name} {member.last_name}
                      </p>

                      <p className="mt-1 break-all text-sm text-gray-500">
                        {member.email}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Class Projects"
            description="Projects assigned to this class."
          />

          {projects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
              No projects yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/student/projects/${project.id}`}
                  className="group rounded-3xl border border-gray-400 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-xl font-black text-gray-900 group-hover:text-[#00B8B0]">
                        {project.title}
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        {getProjectTypeLabel(project.project_type)}
                      </p>
                    </div>

                    <span className="w-fit rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0]">
                      {project.status}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                      <p className="text-gray-500">Deadline</p>

                      <p className="mt-1 font-bold text-gray-900">
                        {project.deadline
                          ? new Date(project.deadline).toLocaleString()
                          : 'No deadline'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-500">
                      Open project details
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
      </div>
    </DashboardLayout>
  )
}

export default StudentClassDetailsPage