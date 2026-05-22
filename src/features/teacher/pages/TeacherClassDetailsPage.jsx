import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { getProjectTypeLabel } from '../../../config/projectTypes'

function TeacherClassDetailsPage() {
  const { classId } = useParams()

  const [classData, setClassData] = useState(null)
  const [students, setStudents] = useState([])
  const [groups, setGroups] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [groupMethod, setGroupMethod] = useState('manual')

  const [groupName, setGroupName] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const [randomGroupSize, setRandomGroupSize] = useState(4)
  const [randomPreviewGroups, setRandomPreviewGroups] = useState([])

  const [message, setMessage] = useState('')
  const [studentSearch, setStudentSearch] = useState('')

const [studentGroupSize, setStudentGroupSize] = useState(4)
const [updatingStudentGrouping, setUpdatingStudentGrouping] = useState(false)

const [performanceGroupSize, setPerformanceGroupSize] = useState(4)
const [performancePreviewGroups, setPerformancePreviewGroups] = useState([])

  useEffect(() => {
    fetchClassDetails()
  }, [classId])

  async function fetchClassDetails() {
    setLoading(true)
    setMessage('')

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

    const { data: memberRows } = await supabase.rpc('get_class_students', {
      class_uuid: classId,
    })

    const studentsWithProfiles = await Promise.all(
      (memberRows || []).map(async (member) => {
        const { data: studentGroup } = await supabase.rpc(
          'get_student_group_in_class',
          {
            class_uuid: classId,
            student_uuid: member.student_id,
          }
        )

        return {
          id: member.member_id,
          student_id: member.student_id,
          joined_at: member.joined_at,
          profile: {
            first_name: member.first_name,
            last_name: member.last_name,
            email: member.email,
          },
          group: studentGroup?.[0] || null,
        }
      })
    )

    const { data: groupRows } = await supabase
      .from('groups')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: true })

    const groupsWithDetails = await Promise.all(
      (groupRows || []).map(async (group) => {
        const { data: memberCount } = await supabase.rpc(
          'get_group_member_count',
          { group_uuid: group.id }
        )

        const { data: groupMembers } = await supabase.rpc(
          'get_group_members',
          { group_uuid: group.id }
        )

        return {
          ...group,
          member_count: memberCount || 0,
          members: groupMembers || [],
        }
      })
    )

    const { data: projectRows } = await supabase
      .from('projects')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })

    setClassData(classInfo)
    setStudentGroupSize(classInfo.student_group_size || 4)
    setStudents(studentsWithProfiles)
    setGroups(groupsWithDetails)
    setProjects(projectRows || [])
    setLoading(false)
  }

  function closeGroupModal() {
    setIsGroupModalOpen(false)
    setGroupMethod('manual')
    setGroupName('')
    setSelectedGroupId('')
    setSelectedStudentId('')
    setRandomGroupSize(4)
    setRandomPreviewGroups([])
    setPerformanceGroupSize(4)
    setPerformancePreviewGroups([])
  }

  async function handleCreateGroup(e) {
    e.preventDefault()
    setMessage('')

    if (!groupName.trim()) {
      setMessage('Group name is required.')
      return
    }

    const { error } = await supabase.from('groups').insert({
      class_id: classId,
      group_name: groupName.trim(),
      grouping_method: 'manual',
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setGroupName('')
    await fetchClassDetails()
  }

  async function handleAssignStudent(e) {
    e.preventDefault()
    setMessage('')

    if (!selectedGroupId || !selectedStudentId) {
      setMessage('Please select both a group and a student.')
      return
    }

    const selectedStudent = students.find(
      (student) => student.student_id === selectedStudentId
    )

    if (selectedStudent?.group) {
      setMessage('This student already belongs to a group in this class.')
      return
    }

    const { error } = await supabase.from('group_members').insert({
      group_id: selectedGroupId,
      student_id: selectedStudentId,
    })

    if (error) {
      setMessage(
        error.code === '23505'
          ? 'This student is already in that group.'
          : error.message
      )
      return
    }

    setSelectedGroupId('')
    setSelectedStudentId('')
    await fetchClassDetails()
  }

  function handleGenerateRandomGroups() {
    setMessage('')

    const availableStudents = students.filter((student) => !student.group)

    if (availableStudents.length === 0) {
      setMessage('No unassigned students available for random grouping.')
      return
    }

    const size = Number(randomGroupSize)

    if (!size || size < 2) {
      setMessage('Group size must be at least 2.')
      return
    }

    const shuffled = [...availableStudents].sort(() => Math.random() - 0.5)
    const generated = []

    for (let index = 0; index < shuffled.length; index += size) {
      generated.push({
        name: `Random Group ${generated.length + 1}`,
        students: shuffled.slice(index, index + size),
      })
    }

    setRandomPreviewGroups(generated)
  }

  async function handleSaveRandomGroups() {
    setMessage('')

    if (randomPreviewGroups.length === 0) {
      setMessage('Generate random groups first.')
      return
    }

    for (const previewGroup of randomPreviewGroups) {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          class_id: classId,
          group_name: previewGroup.name,
          grouping_method: 'random',
        })
        .select()
        .single()

      if (groupError) {
        setMessage(groupError.message)
        return
      }

      const membersToInsert = previewGroup.students.map((student) => ({
        group_id: group.id,
        student_id: student.student_id,
      }))

      const { error: memberError } = await supabase
        .from('group_members')
        .insert(membersToInsert)

      if (memberError) {
        setMessage(memberError.message)
        return
      }
    }

    setMessage('Random groups saved successfully.')
    setRandomPreviewGroups([])
    await fetchClassDetails()
  }
async function handleOpenStudentGrouping() {
  setUpdatingStudentGrouping(true)
  setMessage('')

  if (!studentGroupSize || Number(studentGroupSize) < 2) {
    setMessage('Members per group must be at least 2.')
    setUpdatingStudentGrouping(false)
    return
  }

  const { error } = await supabase
    .from('classes')
    .update({
      student_grouping_open: true,
      student_grouping_locked: false,
      student_group_size: Number(studentGroupSize),
    })
    .eq('id', classId)

  if (error) {
    setMessage(error.message)
    setUpdatingStudentGrouping(false)
    return
  }

  setMessage('Student-formed grouping is now open.')
  setUpdatingStudentGrouping(false)
  await fetchClassDetails()
}

async function handleCloseStudentGrouping() {
  setUpdatingStudentGrouping(true)
  setMessage('')

  const { error } = await supabase
    .from('classes')
    .update({
      student_grouping_open: false,
    })
    .eq('id', classId)

  if (error) {
    setMessage(error.message)
    setUpdatingStudentGrouping(false)
    return
  }

  setMessage('Student-formed grouping is now closed.')
  setUpdatingStudentGrouping(false)
  await fetchClassDetails()
}

async function handleLockStudentGrouping() {
  setUpdatingStudentGrouping(true)
  setMessage('')

  const { error } = await supabase
    .from('classes')
    .update({
      student_grouping_open: false,
      student_grouping_locked: true,
    })
    .eq('id', classId)

  if (error) {
    setMessage(error.message)
    setUpdatingStudentGrouping(false)
    return
  }

  setMessage('Student-formed groups have been finalized and locked.')
  setUpdatingStudentGrouping(false)
  await fetchClassDetails()
}

function getStudentPerformanceScore(student) {
  const contributionScore = Number(student.contribution_score || 0)
  const completedTasks = Number(student.completed_tasks_count || 0)
  const overdueTasks = Number(student.overdue_tasks_count || 0)

  return contributionScore + completedTasks * 5 - overdueTasks * 3
}

function handleGeneratePerformanceGroups() {
  setMessage('')

  const availableStudents = students.filter((student) => !student.group)

  if (availableStudents.length === 0) {
    setMessage('No unassigned students available for similar performance grouping.')
    return
  }

  const size = Number(performanceGroupSize)

  if (!size || size < 2) {
    setMessage('Group size must be at least 2.')
    return
  }

  const sorted = [...availableStudents].sort(
    (a, b) => getStudentPerformanceScore(b) - getStudentPerformanceScore(a)
  )

  const generated = []

  for (let index = 0; index < sorted.length; index += size) {
    generated.push({
      name: `Performance Group ${generated.length + 1}`,
      students: sorted.slice(index, index + size),
    })
  }

  setPerformancePreviewGroups(generated)
}

async function handleSavePerformanceGroups() {
  setMessage('')

  if (performancePreviewGroups.length === 0) {
    setMessage('Generate similar performance groups first.')
    return
  }

  for (const previewGroup of performancePreviewGroups) {
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        class_id: classId,
        group_name: previewGroup.name,
        grouping_method: 'performance',
      })
      .select()
      .single()

    if (groupError) {
      setMessage(groupError.message)
      return
    }

    const membersToInsert = previewGroup.students.map((student) => ({
      group_id: group.id,
      student_id: student.student_id,
    }))

    const { error: memberError } = await supabase
      .from('group_members')
      .insert(membersToInsert)

    if (memberError) {
      setMessage(memberError.message)
      return
    }
  }

  setMessage('Similar performance groups saved successfully.')
  setPerformancePreviewGroups([])
  await fetchClassDetails()
}
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.profile?.first_name || ''} ${
      student.profile?.last_name || ''
    }`.toLowerCase()

    const email = (student.profile?.email || '').toLowerCase()
    const search = studentSearch.toLowerCase()

    return fullName.includes(search) || email.includes(search)
  })

  const unassignedStudents = students.filter((student) => !student.group)

  if (loading) {
    return (
      <DashboardLayout
        title="Collabify"
        pageTitle="Class Details"
        navigation={teacherNavigation}
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
        navigation={teacherNavigation}
      >
        <p className="text-gray-500">Class not found.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Class Details"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Link
              to="/teacher/classes"
              className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
            >
              <ChevronLeft size={18} />
              Back to Classes
            </Link>
            <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
              {classData.class_name}
            </h1>

            <p className="mt-2 max-w-3xl text-gray-500">
              {classData.section} • {classData.semester} •{' '}
              {classData.academic_year}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:pt-10">
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="h-11 rounded-xl border border-[#00CFC8]/40 bg-white px-5 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
            >
              Create Group
            </button>

            <Link
              to={`/teacher/classes/${classId}/projects/create`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 text-sm font-black text-black transition-all hover:opacity-90"
            >
              + Add Project
            </Link>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            title="Students"
            value={students.length}
            description="Joined students"
          />
          <Card
            title="Groups"
            value={groups.length}
            description="Created groups"
          />
          <Card
            title="Projects"
            value={projects.length}
            description="Class projects"
          />
          <Card
            title="Class Code"
            value={classData.class_code}
            description="Share with students"
          />
        </div>

        <div className="rounded-3xl border border-gray-400 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <SectionHeader
              title="Students"
              description="Joined students and their group assignment."
            />

            <input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search by student name or email..."
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8] lg:w-80"
            />
          </div>

          {students.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
              No students have joined yet.
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
              No students match your search.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-3xl border border-gray-400">
              <div className="max-h-[400px] overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr>
                      <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                        Student
                      </th>

                      <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                        Email
                      </th>

                      <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                        Group
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="border-b border-gray-400 p-4 font-bold text-gray-900">
                          {student.profile?.first_name}{' '}
                          {student.profile?.last_name}
                        </td>

                        <td className="break-all border-b border-gray-400 p-4 text-gray-600">
                          {student.profile?.email}
                        </td>

                        <td className="border-b border-gray-400 p-4 text-gray-600">
                          {student.group
                            ? student.group.group_name
                            : 'No group yet'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                  to={`/teacher/projects/${project.id}`}
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

                  <div className="mt-5 rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3 text-sm">
                    <p className="text-gray-500">Deadline</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {project.deadline
                        ? new Date(project.deadline).toLocaleString()
                        : 'No deadline'}
                    </p>
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

        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Groups"
            description="Groups created inside this class."
          />

          {groups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
              No groups created yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-gray-400">
              <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr>
                      <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                        Group
                      </th>

                      <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                        Method
                      </th>

                      <th className="border-b border-gray-400 p-4 text-left text-gray-700">
                        Members
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {groups.map((group) => (
                      <tr key={group.id} className="align-top hover:bg-gray-50">
                        <td className="whitespace-nowrap border-b border-gray-400 p-4 font-bold text-gray-900">
                          {group.group_name}
                        </td>

                        <td className="whitespace-nowrap border-b border-gray-400 p-4 text-gray-600">
                          {group.grouping_method || 'manual'}
                        </td>

                        <td className="border-b border-gray-400 p-4">
                          {group.members.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              No members yet.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              {group.members.map((member) => (
                                <div
                                  key={member.member_id}
                                  className="rounded-xl border border-gray-400 bg-[#EAF2FF] px-3 py-2 text-xs"
                                >
                                  <p className="font-bold text-gray-900">
                                    {member.first_name} {member.last_name}
                                  </p>

                                  <p className="break-all text-gray-600">
                                    {member.email}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-gray-400 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-gray-300 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-sm font-semibold uppercase tracking-[0.2em] text-transparent">
                  Group Management
                </p>

                <h2 className="mt-1 text-3xl font-black text-gray-900">
                  Create Groups
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Manage grouping methods for {classData.class_name}.
                </p>
              </div>

              <button
                onClick={closeGroupModal}
                className="rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(90vh-120px)] space-y-5 overflow-y-auto p-5">
<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
  {[
    { value: 'manual', label: 'Manual' },
    { value: 'random', label: 'Random' },
    { value: 'performance', label: 'Similar Performance' },
    { value: 'student', label: 'Student-Formed' },
  ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setGroupMethod(method.value)}
                    className={`rounded-2xl border p-3 text-sm font-semibold transition-all ${
                      groupMethod === method.value
                        ? 'border-[#00CFC8]/40 bg-gradient-to-r from-cyan-400 to-green-400 text-black'
                        : 'border-gray-400 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              {groupMethod === 'manual' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
<div>
  <h2 className="text-2xl font-black text-black">
    Create Manual Group
  </h2>

  <p className="mt-1 text-sm text-gray-600">
    Create a group first, then assign students.
  </p>
</div>

                    <form onSubmit={handleCreateGroup} className="space-y-3">
                      <input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Group name e.g. Group 1"
                        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                      />

                      <button className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-4 py-3 text-sm font-black text-black transition-all hover:opacity-90">
                        Create Group
                      </button>
                    </form>
                  </div>

                  <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
<div>
  <h2 className="text-2xl font-black text-black">
    Assign Student to Group
  </h2>

  <p className="mt-1 text-sm text-gray-600">
    A student can only belong to one group per class.
  </p>
</div>

                    <form onSubmit={handleAssignStudent} className="space-y-3">
                      <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                      >
                        <option value="">Select Group</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.group_name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                      >
                        <option value="">Select Student</option>
                        {unassignedStudents.map((student) => (
                          <option
                            key={student.student_id}
                            value={student.student_id}
                          >
                            {student.profile?.first_name}{' '}
                            {student.profile?.last_name}
                          </option>
                        ))}
                      </select>

                      <button className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-4 py-3 text-sm font-black text-black transition-all hover:opacity-90">
                        Assign Student
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {groupMethod === 'random' && (
                <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
<div>
  <h2 className="text-2xl font-black text-black">
    Random Assignment
  </h2>

  <p className="mt-1 text-sm text-gray-600">
    Randomly distribute unassigned students into groups.
  </p>
</div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <input
                      type="number"
                      min="2"
                      value={randomGroupSize}
                      onChange={(e) => setRandomGroupSize(e.target.value)}
                      className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                      placeholder="Members per group"
                    />

                    <button
                      onClick={handleGenerateRandomGroups}
                      className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-4 py-3 text-sm font-black text-black transition-all hover:opacity-90"
                    >
                      Generate Preview
                    </button>

                    <button
                      onClick={handleSaveRandomGroups}
                      disabled={randomPreviewGroups.length === 0}
                      className="rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-3 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50 disabled:opacity-50"
                    >
                      Save Groups
                    </button>
                  </div>

                  <div className="mt-5">
                    {randomPreviewGroups.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                        No random preview generated yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {randomPreviewGroups.map((group, index) => (
                          <div
                            key={index}
                            className="rounded-3xl border border-gray-400 bg-[#F8FBFF] p-4"
                          >
                            <h3 className="font-black text-gray-900">
                              {group.name}
                            </h3>

                            <div className="mt-3 space-y-2">
                              {group.students.map((student) => (
                                <div
                                  key={student.student_id}
                                  className="rounded-xl border border-gray-400 bg-[#EAF2FF] p-2 text-sm"
                                >
                                  <p className="font-bold text-gray-900">
                                    {student.profile?.first_name}{' '}
                                    {student.profile?.last_name}
                                  </p>
                                  <p className="break-all text-gray-600">
                                    {student.profile?.email}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {groupMethod === 'ai' && (
                <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                  AI Balanced Grouping will be connected next through n8n.
                </div>
              )}

{groupMethod === 'performance' && (
  <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
    <div>
      <h2 className="text-2xl font-black text-black">
        Similar Performance Grouping
      </h2>

      <p className="mt-1 text-sm text-gray-600">
        Groups students with similar performance levels together using available
        contribution and task data.
      </p>
    </div>

    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
      <input
        type="number"
        min="2"
        value={performanceGroupSize}
        onChange={(e) => setPerformanceGroupSize(e.target.value)}
        className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
        placeholder="Members per group"
      />

      <button
        onClick={handleGeneratePerformanceGroups}
        className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-4 py-3 text-sm font-black text-black transition-all hover:opacity-90"
      >
        Generate Preview
      </button>

      <button
        onClick={handleSavePerformanceGroups}
        disabled={performancePreviewGroups.length === 0}
        className="rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-3 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50 disabled:opacity-50"
      >
        Save Groups
      </button>
    </div>

    <div className="mt-5">
      {performancePreviewGroups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
          No similar performance preview generated yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {performancePreviewGroups.map((group, index) => (
            <div
              key={index}
              className="rounded-3xl border border-gray-400 bg-[#F8FBFF] p-4"
            >
              <h3 className="font-black text-gray-900">
                {group.name}
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                Similar score range
              </p>

              <div className="mt-3 space-y-2">
                {group.students.map((student) => (
                  <div
                    key={student.student_id}
                    className="rounded-xl border border-gray-400 bg-[#EAF2FF] p-2 text-sm"
                  >
                    <p className="font-bold text-gray-900">
                      {student.profile?.first_name}{' '}
                      {student.profile?.last_name}
                    </p>

                    <p className="break-all text-gray-600">
                      {student.profile?.email}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-[#00B8B0]">
                      Score: {getStudentPerformanceScore(student)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}

{groupMethod === 'student' && (
  <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
    <div>
      <h2 className="text-2xl font-black text-black">
        Student-Formed Groups
      </h2>

      <p className="mt-1 text-sm text-gray-600">
        Set the maximum number of members per group. Students can create or join
        groups only while formation is open.
      </p>
    </div>

    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
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
        <p className="text-sm text-gray-600">Unassigned Students</p>
        <p className="mt-1 text-xl font-black text-gray-900">
          {unassignedStudents.length}
        </p>
      </div>
    </div>

    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
      <input
        type="number"
        min="2"
        value={studentGroupSize}
        onChange={(e) => setStudentGroupSize(e.target.value)}
        disabled={classData.student_grouping_locked}
        placeholder="Members per group"
        className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8] disabled:opacity-50"
      />

      <button
        onClick={handleOpenStudentGrouping}
        disabled={updatingStudentGrouping || classData.student_grouping_locked}
        className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-4 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
      >
        Open Formation
      </button>

      <button
        onClick={handleCloseStudentGrouping}
        disabled={updatingStudentGrouping || classData.student_grouping_locked}
        className="rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-3 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50 disabled:opacity-50"
      >
        Close Formation
      </button>

      <button
        onClick={handleLockStudentGrouping}
        disabled={updatingStudentGrouping || classData.student_grouping_locked}
        className="rounded-xl border border-gray-400 bg-gray-900 px-4 py-3 text-sm font-black text-white transition-all hover:bg-black disabled:opacity-50"
      >
        Finalize Groups
      </button>
    </div>

    <div className="mt-6">
      <h3 className="text-lg font-black text-gray-900">
        Current Student-Formed Groups
      </h3>

      {groups.filter((group) => group.grouping_method === 'student').length === 0 ? (
        <div className="mt-3 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
          No student-formed groups yet.
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups
            .filter((group) => group.grouping_method === 'student')
            .map((group) => (
              <div
                key={group.id}
                className="rounded-3xl border border-gray-400 bg-[#F8FBFF] p-4"
              >
                <h3 className="font-black text-gray-900">
                  {group.group_name}
                </h3>

                <p className="text-sm text-gray-600">
                  {group.members.length}/{classData.student_group_size || 4}{' '}
                  members
                </p>

                <div className="mt-3 space-y-2">
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
              </div>
            ))}
        </div>
      )}
    </div>
  </div>
)}

              <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
<div>
  <h2 className="text-2xl font-black text-black">
    Current Groups
  </h2>

  <p className="mt-1 text-sm text-gray-600">
    Existing groups and members in this class.
  </p>
</div>

                {groups.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                    No groups created yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-3xl border border-gray-400 bg-[#F8FBFF] p-4"
                      >
                        <h3 className="font-black text-gray-900">
                          {group.group_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Method: {group.grouping_method || 'manual'}
                        </p>

                        <div className="mt-3 space-y-2">
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
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
<div>
  <h2 className="text-2xl font-black text-black">
    Unassigned Students
  </h2>

  <p className="mt-1 text-sm text-gray-600">
    Students not yet assigned to any group.
  </p>
</div>

                {unassignedStudents.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                    All students are already assigned.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {unassignedStudents.map((student) => (
                      <div
                        key={student.student_id}
                        className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3 text-sm"
                      >
                        <p className="font-bold text-gray-900">
                          {student.profile?.first_name}{' '}
                          {student.profile?.last_name}
                        </p>
                        <p className="break-all text-gray-600">
                          {student.profile?.email}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default TeacherClassDetailsPage