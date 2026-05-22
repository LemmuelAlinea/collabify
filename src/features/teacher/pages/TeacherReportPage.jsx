import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import SectionHeader from '../../../components/ui/SectionHeader'
import Card from '../../../components/ui/Card'

function TeacherReportsPage() {
  const [teacher, setTeacher] = useState(null)
  const [classes, setClasses] = useState([])
  const [projects, setProjects] = useState([])
  const [groups, setGroups] = useState([])
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [filters, setFilters] = useState({
    reportType: 'class',
    classId: 'all',
    projectId: 'all',
    groupId: 'all',
    studentId: 'all',
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchReportData()
  }, [])

  async function fetchReportData() {
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .maybeSingle()

    setTeacher({
      id: user.id,
      email: profile?.email || user.email,
      name:
        `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
        user.email,
    })

    const { data: classRows } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    const classIds = (classRows || []).map((item) => item.id)

    let projectRows = []
    let groupRows = []
    let memberRows = []
    let taskRows = []
    let activityRows = []

    if (classIds.length > 0) {
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .in('class_id', classIds)
        .order('created_at', { ascending: false })

      projectRows = projectsData || []

      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .in('class_id', classIds)
        .order('created_at', { ascending: false })

      groupRows = groupsData || []

      const { data: membersData } = await supabase
        .from('class_members')
        .select(`
          *,
          classes (
            id,
            class_name,
            section
          ),
          profiles (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .in('class_id', classIds)

      memberRows = membersData || []
    }

    const projectIds = projectRows.map((project) => project.id)

    if (projectIds.length > 0) {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (
            id,
            title,
            class_id
          )
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      taskRows = tasksData || []

      const { data: activityData } = await supabase
        .from('project_activity_logs')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(200)

      activityRows = activityData || []
    }

    setClasses(classRows || [])
    setProjects(projectRows)
    setGroups(groupRows)
    setMembers(memberRows)
    setTasks(taskRows)
    setActivities(activityRows)
    setLoading(false)
  }

  function handleFilterChange(e) {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    })
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (filters.classId !== 'all' && project.class_id !== filters.classId) {
        return false
      }

      return true
    })
  }, [projects, filters.classId])

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      if (filters.classId !== 'all' && group.class_id !== filters.classId) {
        return false
      }

      return true
    })
  }, [groups, filters.classId])

  const reportData = useMemo(() => {
    const selectedClass =
      filters.classId === 'all'
        ? null
        : classes.find((item) => item.id === filters.classId)

    const selectedProject =
      filters.projectId === 'all'
        ? null
        : projects.find((item) => item.id === filters.projectId)

    const selectedGroup =
      filters.groupId === 'all'
        ? null
        : groups.find((item) => item.id === filters.groupId)

    const selectedStudent =
      filters.studentId === 'all'
        ? null
        : members.find((item) => item.student_id === filters.studentId)

    const scopedProjects = projects.filter((project) => {
      if (selectedClass && project.class_id !== selectedClass.id) return false
      if (selectedProject && project.id !== selectedProject.id) return false
      return true
    })

    const scopedProjectIds = scopedProjects.map((project) => project.id)

    const scopedGroups = groups.filter((group) => {
      if (selectedClass && group.class_id !== selectedClass.id) return false
      if (selectedGroup && group.id !== selectedGroup.id) return false
      return true
    })

    const scopedGroupIds = scopedGroups.map((group) => group.id)

    const scopedMembers = members.filter((member) => {
      if (selectedClass && member.class_id !== selectedClass.id) return false
      if (selectedStudent && member.student_id !== selectedStudent.student_id) {
        return false
      }
      return true
    })

    const scopedTasks = tasks.filter((task) => {
      if (scopedProjectIds.length > 0 && !scopedProjectIds.includes(task.project_id)) {
        return false
      }

      if (selectedGroup && task.group_id !== selectedGroup.id) return false

      if (selectedStudent && task.assigned_to !== selectedStudent.student_id) {
        return false
      }

      return true
    })

    const scopedActivities = activities.filter((activity) => {
      if (
        scopedProjectIds.length > 0 &&
        !scopedProjectIds.includes(activity.project_id)
      ) {
        return false
      }

      if (selectedGroup && activity.group_id !== selectedGroup.id) return false

      return true
    })

    return {
      selectedClass,
      selectedProject,
      selectedGroup,
      selectedStudent,
      scopedProjects,
      scopedGroups,
      scopedMembers,
      scopedTasks,
      scopedActivities,
    }
  }, [classes, projects, groups, members, tasks, activities, filters])

  const completedTasks = reportData.scopedTasks.filter((task) =>
    ['submitted', 'completed'].includes(task.status)
  )

  const activeTasks = reportData.scopedTasks.filter(
    (task) => !['submitted', 'completed'].includes(task.status)
  )

  function formatDateTime(value) {
    if (!value) return 'N/A'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return 'Invalid date'

    return date.toLocaleString()
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function getReportTitle() {
    const map = {
      class: 'Class Report',
      project: 'Project Report',
      group: 'Group Report',
      member: 'Member Report',
      tasks: 'Task Report',
      general: 'General Teacher Report',
    }

    return map[filters.reportType] || 'Teacher Report'
  }

  function handleDownloadPdf() {
    const generatedAt = new Date().toLocaleString()

    const projectRows = reportData.scopedProjects
      .map(
        (project) => `
          <tr>
            <td><strong>${escapeHtml(project.title)}</strong></td>
            <td>${escapeHtml(project.status || 'N/A')}</td>
            <td>${escapeHtml(formatDateTime(project.deadline))}</td>
          </tr>
        `
      )
      .join('')

    const groupRows = reportData.scopedGroups
      .map(
        (group) => `
          <tr>
            <td><strong>${escapeHtml(group.group_name)}</strong></td>
            <td>${escapeHtml(group.grouping_method || 'manual')}</td>
            <td>${escapeHtml(group.class_id)}</td>
          </tr>
        `
      )
      .join('')

    const memberRows = reportData.scopedMembers
      .map(
        (member) => `
          <tr>
            <td>
              <strong>${escapeHtml(member.profiles?.first_name)} ${escapeHtml(
          member.profiles?.last_name
        )}</strong>
            </td>
            <td>${escapeHtml(member.profiles?.email)}</td>
            <td>${escapeHtml(member.classes?.class_name)}</td>
            <td>${escapeHtml(member.classes?.section)}</td>
          </tr>
        `
      )
      .join('')

    const taskRows = reportData.scopedTasks
      .map(
        (task) => `
          <tr>
            <td><strong>${escapeHtml(task.title)}</strong></td>
            <td>${escapeHtml(task.status)}</td>
            <td>${escapeHtml(task.priority || 'medium')}</td>
            <td>${escapeHtml(formatDateTime(task.due_date))}</td>
          </tr>
        `
      )
      .join('')

    const activityRows = reportData.scopedActivities
      .slice(0, 30)
      .map(
        (activity) => `
          <tr>
            <td>${escapeHtml(activity.description)}</td>
            <td>${escapeHtml(formatDateTime(activity.created_at))}</td>
          </tr>
        `
      )
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(getReportTitle())}</title>
          <style>
            body {
              margin: 0;
              padding: 42px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: white;
              line-height: 1.45;
            }

            .header {
              border-bottom: 3px solid #111827;
              padding-bottom: 18px;
              margin-bottom: 28px;
            }

            .eyebrow {
              color: #0f766e;
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 0.18em;
              text-transform: uppercase;
            }

            h1 {
              margin: 6px 0 0;
              font-size: 32px;
              font-weight: 900;
            }

            h2 {
              margin: 30px 0 10px;
              padding-bottom: 6px;
              border-bottom: 1px solid #d1d5db;
              font-size: 20px;
              font-weight: 900;
            }

            p {
              margin: 4px 0;
              font-size: 12px;
            }

            .muted {
              color: #6b7280;
            }

            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-top: 14px;
            }

            .summary-card {
              border: 1px solid #9ca3af;
              border-radius: 12px;
              padding: 12px;
              background: #f8fbff;
            }

            .summary-card strong {
              display: block;
              font-size: 11px;
              color: #374151;
            }

            .summary-card span {
              display: block;
              margin-top: 5px;
              font-size: 22px;
              font-weight: 900;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 11px;
            }

            th {
              border: 1px solid #9ca3af;
              background: #e5e7eb;
              padding: 8px;
              text-align: left;
              font-weight: 900;
            }

            td {
              border: 1px solid #9ca3af;
              padding: 8px;
              vertical-align: top;
            }

            .section {
              page-break-inside: avoid;
            }

            .footer {
              margin-top: 32px;
              padding-top: 12px;
              border-top: 1px solid #d1d5db;
              font-size: 11px;
              color: #6b7280;
            }

            @media print {
              body {
                padding: 28px;
              }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div class="eyebrow">Collabify Teacher Report</div>
            <h1>${escapeHtml(getReportTitle())}</h1>
            <p class="muted">Generated by ${escapeHtml(teacher?.name)}</p>
            <p class="muted">Generated on ${escapeHtml(generatedAt)}</p>
          </div>

          <section class="section">
            <h2>Report Scope</h2>
            <p><strong>Class:</strong> ${escapeHtml(
              reportData.selectedClass?.class_name || 'All Classes'
            )}</p>
            <p><strong>Project:</strong> ${escapeHtml(
              reportData.selectedProject?.title || 'All Projects'
            )}</p>
            <p><strong>Group:</strong> ${escapeHtml(
              reportData.selectedGroup?.group_name || 'All Groups'
            )}</p>
            <p><strong>Student:</strong> ${escapeHtml(
              reportData.selectedStudent
                ? `${reportData.selectedStudent.profiles?.first_name || ''} ${
                    reportData.selectedStudent.profiles?.last_name || ''
                  }`
                : 'All Students'
            )}</p>
          </section>

          <section class="section">
            <h2>Summary</h2>
            <div class="summary-grid">
              <div class="summary-card">
                <strong>Classes</strong>
                <span>${classes.length}</span>
              </div>
              <div class="summary-card">
                <strong>Projects</strong>
                <span>${reportData.scopedProjects.length}</span>
              </div>
              <div class="summary-card">
                <strong>Groups</strong>
                <span>${reportData.scopedGroups.length}</span>
              </div>
              <div class="summary-card">
                <strong>Tasks</strong>
                <span>${reportData.scopedTasks.length}</span>
              </div>
            </div>
          </section>

          <section class="section">
            <h2>Projects</h2>
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                ${projectRows || '<tr><td colspan="3">No projects found.</td></tr>'}
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2>Groups</h2>
            <table>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Method</th>
                  <th>Class ID</th>
                </tr>
              </thead>
              <tbody>
                ${groupRows || '<tr><td colspan="3">No groups found.</td></tr>'}
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2>Members</h2>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Class</th>
                  <th>Section</th>
                </tr>
              </thead>
              <tbody>
                ${memberRows || '<tr><td colspan="4">No members found.</td></tr>'}
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2>Tasks</h2>
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                ${taskRows || '<tr><td colspan="4">No tasks found.</td></tr>'}
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2>Recent Activity</h2>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${activityRows || '<tr><td colspan="2">No activity found.</td></tr>'}
              </tbody>
            </table>
          </section>

          <div class="footer">
            This report was generated from Collabify Teacher Reports.
          </div>

          <script>
            window.onload = function () {
              window.print()
            }
          </script>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      setMessage('Please allow pop-ups to download the PDF.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Reports"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <h1 className="bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Reports
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            Generate downloadable class, project, group, member, and task reports.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading reports data...</p>
        ) : (
          <>
            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Report Filters"
                description="Choose the scope and type of report to generate."
              />

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <select
                  name="reportType"
                  value={filters.reportType}
                  onChange={handleFilterChange}
                  className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#00CFC8]"
                >
                  <option value="general">General Report</option>
                  <option value="class">Class Report</option>
                  <option value="project">Project Report</option>
                  <option value="group">Group Report</option>
                  <option value="member">Member Report</option>
                  <option value="tasks">Task Report</option>
                </select>

                <select
                  name="classId"
                  value={filters.classId}
                  onChange={handleFilterChange}
                  className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#00CFC8]"
                >
                  <option value="all">All Classes</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.class_name} - {classItem.section}
                    </option>
                  ))}
                </select>

                <select
                  name="projectId"
                  value={filters.projectId}
                  onChange={handleFilterChange}
                  className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#00CFC8]"
                >
                  <option value="all">All Projects</option>
                  {filteredProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>

                <select
                  name="groupId"
                  value={filters.groupId}
                  onChange={handleFilterChange}
                  className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#00CFC8]"
                >
                  <option value="all">All Groups</option>
                  {filteredGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.group_name}
                    </option>
                  ))}
                </select>

                <select
                  name="studentId"
                  value={filters.studentId}
                  onChange={handleFilterChange}
                  className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#00CFC8]"
                >
                  <option value="all">All Students</option>
                  {members.map((member) => (
                    <option key={member.student_id} value={member.student_id}>
                      {member.profiles?.first_name} {member.profiles?.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleDownloadPdf}
                className="mt-5 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90"
              >
                Download PDF Report
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Card
                title="Projects"
                value={reportData.scopedProjects.length}
                description="Inside current scope"
              />

              <Card
                title="Groups"
                value={reportData.scopedGroups.length}
                description="Inside current scope"
              />

              <Card
                title="Tasks"
                value={reportData.scopedTasks.length}
                description="Inside current scope"
              />

              <Card
                title="Completed"
                value={`${completedTasks.length}/${reportData.scopedTasks.length}`}
                description="Submitted or completed"
              />
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Report Preview"
                description="Quick preview of the selected report scope."
              />

              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
                  <p className="text-sm text-gray-500">Selected Class</p>
                  <p className="mt-1 font-black text-gray-900">
                    {reportData.selectedClass
                      ? `${reportData.selectedClass.class_name} - ${reportData.selectedClass.section}`
                      : 'All Classes'}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
                  <p className="text-sm text-gray-500">Selected Project</p>
                  <p className="mt-1 font-black text-gray-900">
                    {reportData.selectedProject?.title || 'All Projects'}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
                  <p className="text-sm text-gray-500">Selected Group</p>
                  <p className="mt-1 font-black text-gray-900">
                    {reportData.selectedGroup?.group_name || 'All Groups'}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    Tasks Preview
                  </h3>

                  {reportData.scopedTasks.length === 0 ? (
                    <div className="mt-3 rounded-2xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                      No tasks found.
                    </div>
                  ) : (
                    <div className="mt-3 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                      {reportData.scopedTasks.slice(0, 8).map((task) => (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4"
                        >
                          <p className="font-black text-gray-900">
                            {task.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {task.status} • {task.priority || 'medium'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    Members Preview
                  </h3>

                  {reportData.scopedMembers.length === 0 ? (
                    <div className="mt-3 rounded-2xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                      No members found.
                    </div>
                  ) : (
                    <div className="mt-3 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                      {reportData.scopedMembers.slice(0, 8).map((member) => (
                        <div
                          key={member.id}
                          className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4"
                        >
                          <p className="font-black text-gray-900">
                            {member.profiles?.first_name}{' '}
                            {member.profiles?.last_name}
                          </p>
                          <p className="break-all text-sm text-gray-500">
                            {member.profiles?.email}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default TeacherReportsPage