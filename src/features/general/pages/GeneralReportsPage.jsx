import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import Card from '../../../components/ui/Card'
import SectionHeader from '../../../components/ui/SectionHeader'
import { supabase } from '../../../lib/supabaseClient'
import {
  generalManagerNavigation,
  generalSponsorNavigation,
} from '../config/generalNavigation'

function GeneralReportsPage({ roleType = 'manager' }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [filters, setFilters] = useState({
    reportType: 'general',
    projectId: 'all',
    status: 'all',
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchReportsData()
  }, [])

  function getNavigation() {
    return roleType === 'sponsor'
      ? generalSponsorNavigation
      : generalManagerNavigation
  }

  async function fetchReportsData() {
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

    // eslint-disable-next-line no-useless-assignment
    let projectRows = []

    if (roleType === 'sponsor') {
      const { data, error } = await supabase.rpc('get_general_sponsor_projects', {
        sponsor_uuid: user.id,
      })

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      projectRows = data || []
    } else {
      const { data, error } = await supabase
        .from('general_projects')
        .select('*')
        .eq('project_manager_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      projectRows = data || []
    }

    const projectIds = projectRows.map((project) => project.id)

    let taskRows = []
    let submissionRows = []
    let activityRows = []

    if (projectIds.length > 0) {
      const { data: fetchedTasks } = await supabase
        .from('general_tasks')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      taskRows = fetchedTasks || []

      const { data: fetchedSubmissions } = await supabase
        .from('general_task_submissions')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      submissionRows = fetchedSubmissions || []

      const { data: fetchedActivities } = await supabase
        .from('general_activity_logs')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(200)

      activityRows = fetchedActivities || []
    }

    setProjects(projectRows)
    setTasks(taskRows)
    setSubmissions(submissionRows)
    setActivities(activityRows)
    setLoading(false)
  }

  function handleFilterChange(e) {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    })
  }

  const reportData = useMemo(() => {
    const scopedProjects = projects.filter((project) => {
      if (filters.projectId !== 'all' && project.id !== filters.projectId) {
        return false
      }

      if (filters.status !== 'all' && project.status !== filters.status) {
        return false
      }

      return true
    })

    const scopedProjectIds = scopedProjects.map((project) => project.id)

    const scopedTasks = tasks.filter((task) =>
      scopedProjectIds.includes(task.project_id)
    )

    const scopedSubmissions = submissions.filter((submission) =>
      scopedProjectIds.includes(submission.project_id)
    )

    const scopedActivities = activities.filter((activity) =>
      scopedProjectIds.includes(activity.project_id)
    )

    return {
      scopedProjects,
      scopedTasks,
      scopedSubmissions,
      scopedActivities,
    }
  }, [projects, tasks, submissions, activities, filters])

  const completedTasks = reportData.scopedTasks.filter(
    (task) => task.status === 'completed'
  )

  const activeTasks = reportData.scopedTasks.filter(
    (task) => task.status === 'in_progress'
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
    return roleType === 'sponsor'
      ? 'General Workplace Sponsor Report'
      : 'General Workplace Manager Report'
  }

  function handleDownloadPdf() {
    const generatedAt = new Date().toLocaleString()

    const projectRows = reportData.scopedProjects
      .map(
        (project) => `
          <tr>
            <td><strong>${escapeHtml(project.title)}</strong></td>
            <td>${escapeHtml(project.status)}</td>
            <td>${escapeHtml(project.priority || 'N/A')}</td>
            <td>${escapeHtml(formatDateTime(project.deadline))}</td>
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

    const submissionRows = reportData.scopedSubmissions
      .map(
        (submission) => `
          <tr>
            <td>${escapeHtml(submission.submission_type)}</td>
            <td>${escapeHtml(submission.file_name || submission.content || 'Text Work')}</td>
            <td>${escapeHtml(formatDateTime(submission.created_at))}</td>
          </tr>
        `
      )
      .join('')

    const activityRows = reportData.scopedActivities
      .slice(0, 40)
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
            <div class="eyebrow">Collabify General Workplace Report</div>
            <h1>${escapeHtml(getReportTitle())}</h1>
            <p class="muted">Generated by ${escapeHtml(currentUser?.email)}</p>
            <p class="muted">Generated on ${escapeHtml(generatedAt)}</p>
          </div>

          <section class="section">
            <h2>Summary</h2>
            <div class="summary-grid">
              <div class="summary-card">
                <strong>Projects</strong>
                <span>${reportData.scopedProjects.length}</span>
              </div>
              <div class="summary-card">
                <strong>Tasks</strong>
                <span>${reportData.scopedTasks.length}</span>
              </div>
              <div class="summary-card">
                <strong>Completed Tasks</strong>
                <span>${completedTasks.length}</span>
              </div>
              <div class="summary-card">
                <strong>Submissions</strong>
                <span>${reportData.scopedSubmissions.length}</span>
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
                  <th>Priority</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                ${projectRows || '<tr><td colspan="4">No projects found.</td></tr>'}
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
            <h2>Submissions</h2>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Content / File</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${submissionRows || '<tr><td colspan="3">No submissions found.</td></tr>'}
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
            This report was generated from Collabify General Workplace Reports.
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
      navigation={getNavigation()}
    >
      <div className="space-y-6 text-gray-900">
        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <h1 className="bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Reports
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            Generate downloadable reports for projects, tasks, submissions, and activity.
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
                description="Choose the report scope."
              />

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <select
                  name="reportType"
                  value={filters.reportType}
                  onChange={handleFilterChange}
                  className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#00CFC8]"
                >
                  <option value="general">General Report</option>
                  <option value="project">Project Report</option>
                  <option value="tasks">Task Report</option>
                  <option value="submissions">Submissions Report</option>
                  <option value="activity">Activity Report</option>
                </select>

                <select
                  name="projectId"
                  value={filters.projectId}
                  onChange={handleFilterChange}
                  className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#00CFC8]"
                >
                  <option value="all">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>

                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#00CFC8]"
                >
                  <option value="all">All Status</option>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
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
                title="Tasks"
                value={reportData.scopedTasks.length}
                description="Inside current scope"
              />

              <Card
                title="Active Tasks"
                value={activeTasks.length}
                description="In progress"
              />

              <Card
                title="Completed"
                value={`${completedTasks.length}/${reportData.scopedTasks.length}`}
                description="Finished tasks"
              />
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Report Preview"
                description="Preview of the selected report scope."
              />

              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    Projects Preview
                  </h3>

                  {reportData.scopedProjects.length === 0 ? (
                    <div className="mt-3 rounded-2xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                      No projects found.
                    </div>
                  ) : (
                    <div className="mt-3 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                      {reportData.scopedProjects.slice(0, 8).map((project) => (
                        <div
                          key={project.id}
                          className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4"
                        >
                          <p className="font-black text-gray-900">
                            {project.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {project.status} • {project.priority || 'normal'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default GeneralReportsPage