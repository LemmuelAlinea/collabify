import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Download } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { isAIEnabled, logAIUsage } from '../../../lib/aiSystem'

function TeacherEvaluationDetailsPage() {
  const { projectId, groupId } = useParams()

  const [students, setStudents] = useState([])
  const [evaluation, setEvaluation] = useState(null)
  const [studentGrades, setStudentGrades] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [generatingAiEvaluation, setGeneratingAiEvaluation] = useState(false)
  const [ganttTasks, setGanttTasks] = useState([])
  const [studentSearch, setStudentSearch] = useState('')

  useEffect(() => {
    fetchEvaluationDetails()
  }, [projectId, groupId])

  async function fetchEvaluationDetails() {
    setLoading(true)
    setMessage('')

    const { data: studentRows, error } = await supabase.rpc(
      'get_teacher_evaluation_group_details',
      {
        project_uuid: projectId,
        group_uuid: groupId,
      }
    )

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setStudents(studentRows || [])

    const { data: ganttRows } = await supabase.rpc(
      'get_teacher_evaluation_gantt_data',
      {
        project_uuid: projectId,
        group_uuid: groupId,
      }
    )

    setGanttTasks(ganttRows || [])

    const { data: evalRow } = await supabase
      .from('project_evaluations')
      .select('*')
      .eq('project_id', projectId)
      .eq('group_id', groupId)
      .maybeSingle()

    setEvaluation(evalRow || null)

    if (evalRow) {
      const { data: gradeRows } = await supabase
        .from('student_evaluations')
        .select('*')
        .eq('project_evaluation_id', evalRow.id)

      const gradesMap = {}

      ;(gradeRows || []).forEach((grade) => {
        gradesMap[grade.student_id] = {
          teacher_final_grade: grade.teacher_final_grade ?? '',
          teacher_notes: grade.teacher_notes || '',
          ai_suggested_grade: grade.ai_suggested_grade ?? 0,
          collaboration_score: grade.collaboration_score ?? 0,
          quality_score: grade.quality_score ?? 0,
          ai_strengths: grade.ai_strengths || '',
          ai_weaknesses: grade.ai_weaknesses || '',
          ai_improvement_suggestions:
            grade.ai_improvement_suggestions || '',
          ai_confidence_level: grade.ai_confidence_level || 'medium',
        }
      })

      setStudentGrades(gradesMap)
    } else {
      setStudentGrades({})
    }

    setLoading(false)
  }

  async function ensureEvaluationExists() {
    if (evaluation) return evaluation

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('User not found.')
      return null
    }

    const { data, error } = await supabase
      .from('project_evaluations')
      .insert({
        project_id: projectId,
        group_id: groupId,
        teacher_id: user.id,
        status: 'draft',
        ai_summary: 'AI evaluation will be generated later.',
      })
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      return null
    }

    setEvaluation(data)
    return data
  }

  function handleGradeChange(studentId, field, value) {
    setStudentGrades({
      ...studentGrades,
      [studentId]: {
        ...(studentGrades[studentId] || {}),
        [field]: value,
      },
    })
  }

  async function handleSaveDraft() {
    setMessage('')

    const evalRow = await ensureEvaluationExists()

    if (!evalRow) return

    for (const student of students) {
      const gradeData = studentGrades[student.student_id] || {}

      const { error } = await supabase.from('student_evaluations').upsert(
        {
          project_evaluation_id: evalRow.id,
          student_id: student.student_id,
          contribution_score: student.contribution_score || 0,
          task_completion_score:
            student.assigned_tasks_count > 0
              ? Number(
                  (
                    (student.submitted_tasks_count /
                      student.assigned_tasks_count) *
                    100
                  ).toFixed(2)
                )
              : 0,
          collaboration_score: gradeData.collaboration_score || 0,
          quality_score: gradeData.quality_score || 0,
          ai_suggested_grade: gradeData.ai_suggested_grade || 0,
          teacher_final_grade:
            gradeData.teacher_final_grade === ''
              ? null
              : Number(gradeData.teacher_final_grade),
          teacher_notes: gradeData.teacher_notes || null,
        },
        {
          onConflict: 'project_evaluation_id,student_id',
        }
      )

      if (error) {
        setMessage(error.message)
        return
      }
    }

    setMessage('Evaluation draft saved.')
    await fetchEvaluationDetails()
  }

  async function handleFinalize() {
    const confirmed = window.confirm(
      'Are you sure you want to finalize this evaluation?'
    )

    if (!confirmed) return

    await handleSaveDraft()

    const evalRow = await ensureEvaluationExists()

    if (!evalRow) return

    const { error } = await supabase
      .from('project_evaluations')
      .update({
        status: 'finalized',
        finalized_at: new Date().toISOString(),
      })
      .eq('id', evalRow.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Evaluation finalized.')
    await fetchEvaluationDetails()
  }

async function handleGenerateAiEvaluation() {
  setMessage('')

  const aiEnabled = await isAIEnabled()

  if (!aiEnabled) {
    setMessage('AI features are currently disabled by the platform admin.')
    return
  }

  const evalRow = await ensureEvaluationExists()

  if (!evalRow) return

  const webhookUrl = import.meta.env.VITE_N8N_AI_EVALUATION_WEBHOOK_URL

  if (!webhookUrl) {
    setMessage('Missing n8n evaluation webhook URL in .env file.')
    return
  }

  if (students.length === 0) {
    setMessage('No students found for evaluation.')
    return
  }

  setGeneratingAiEvaluation(true)

  const payload = {
    project_id: projectId,
    group_id: groupId,
    evaluation_id: evalRow.id,
    students: students.map((student) => ({
      student_id: student.student_id,
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      email: student.email,
      assigned_tasks_count: student.assigned_tasks_count,
      submitted_tasks_count: student.submitted_tasks_count,
      in_progress_tasks_count: student.in_progress_tasks_count,
      pending_tasks_count: student.pending_tasks_count,
      total_uploads_count: student.total_uploads_count,
      contribution_score: student.contribution_score,
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
        featureName: 'teacher_ai_evaluation',
        workspace: 'educational',
        status: 'failed',
        metadata: {
          project_id: projectId,
          group_id: groupId,
          evaluation_id: evalRow.id,
          student_count: students.length,
          error: 'n8n request failed',
        },
      })

      setMessage('AI evaluation generation failed.')
      setGeneratingAiEvaluation(false)
      return
    }

    const result = await response.json()

    const { error: evaluationError } = await supabase
      .from('project_evaluations')
      .update({
        status: 'ai_generated',
        ai_summary: result.summary || 'AI evaluation generated.',
      })
      .eq('id', evalRow.id)

    if (evaluationError) {
      await logAIUsage({
        featureName: 'teacher_ai_evaluation',
        workspace: 'educational',
        status: 'failed',
        metadata: {
          project_id: projectId,
          group_id: groupId,
          evaluation_id: evalRow.id,
          error: evaluationError.message,
        },
      })

      setMessage(evaluationError.message)
      setGeneratingAiEvaluation(false)
      return
    }

    for (const aiStudent of result.students || []) {
      const matchingStudent = students.find(
        (item) => item.student_id === aiStudent.student_id
      )

      const { error } = await supabase.from('student_evaluations').upsert(
        {
          project_evaluation_id: evalRow.id,
          student_id: aiStudent.student_id,
          contribution_score: matchingStudent?.contribution_score || 0,
          task_completion_score:
            matchingStudent?.assigned_tasks_count > 0
              ? Number(
                  (
                    (matchingStudent.submitted_tasks_count /
                      matchingStudent.assigned_tasks_count) *
                    100
                  ).toFixed(2)
                )
              : 0,
          collaboration_score: aiStudent.collaboration_score || 0,
          quality_score: aiStudent.quality_score || 0,
          ai_suggested_grade: aiStudent.ai_suggested_grade || 0,
          teacher_notes: aiStudent.reasoning || null,
          ai_strengths: aiStudent.strengths || null,
          ai_weaknesses: aiStudent.weaknesses || null,
          ai_improvement_suggestions:
            aiStudent.improvement_suggestions || null,
          ai_confidence_level: ['low', 'medium', 'high'].includes(
            aiStudent.confidence_level
          )
            ? aiStudent.confidence_level
            : 'medium',
        },
        {
          onConflict: 'project_evaluation_id,student_id',
        }
      )

      if (error) {
        await logAIUsage({
          featureName: 'teacher_ai_evaluation',
          workspace: 'educational',
          status: 'failed',
          metadata: {
            project_id: projectId,
            group_id: groupId,
            evaluation_id: evalRow.id,
            student_id: aiStudent.student_id,
            error: error.message,
          },
        })

        setMessage(error.message)
        setGeneratingAiEvaluation(false)
        return
      }
    }

    await logAIUsage({
      featureName: 'teacher_ai_evaluation',
      workspace: 'educational',
      status: 'success',
      metadata: {
        project_id: projectId,
        group_id: groupId,
        evaluation_id: evalRow.id,
        student_count: students.length,
      },
    })

    setMessage('AI evaluation generated successfully.')
    setGeneratingAiEvaluation(false)
    await fetchEvaluationDetails()
  } catch (error) {
    console.error(error)

    await logAIUsage({
      featureName: 'teacher_ai_evaluation',
      workspace: 'educational',
      status: 'failed',
      metadata: {
        project_id: projectId,
        group_id: groupId,
        error: error.message,
      },
    })

    setMessage('Unexpected error while generating AI evaluation.')
    setGeneratingAiEvaluation(false)
  }
}

  // eslint-disable-next-line no-unused-vars
  function formatDate(dateValue) {
    if (!dateValue) return 'N/A'

    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) return 'Invalid date'

    return date.toLocaleDateString()
  }

  // eslint-disable-next-line no-unused-vars
  function formatDateTime(dateValue) {
    if (!dateValue) return 'N/A'

    const date = new Date(dateValue)

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

  function getTaskCompletionScore(student) {
    if (!student.assigned_tasks_count) return 0

    return Number(
      (
        (student.submitted_tasks_count / student.assigned_tasks_count) *
        100
      ).toFixed(2)
    )
  }

  function getGanttRange() {
    const timestamps = ganttTasks
      .flatMap((task) => [
        task.task_created_at,
        task.task_due_date,
        task.submitted_at,
      ])
      .filter(Boolean)
      .map((dateValue) => new Date(dateValue).getTime())
      .filter((time) => !Number.isNaN(time))

    if (timestamps.length === 0) {
      const now = Date.now()
      return {
        start: now,
        end: now + 1000 * 60 * 60 * 24 * 28,
      }
    }

    const min = Math.min(...timestamps)
    const max = Math.max(...timestamps)
    const padding = 1000 * 60 * 60 * 24 * 2

    return {
      start: min - padding,
      end: max + padding,
    }
  }

  function getGanttPosition(task) {
    const { start, end } = getGanttRange()
    const total = end - start || 1

    const taskStart = new Date(task.task_created_at || task.task_due_date).getTime()
    const taskEnd = new Date(
      task.submitted_at || task.task_due_date || task.task_created_at
    ).getTime()

    const safeStart = Number.isNaN(taskStart) ? start : taskStart
    const safeEnd = Number.isNaN(taskEnd) ? safeStart : taskEnd

    const left = Math.max(0, ((safeStart - start) / total) * 100)
    const width = Math.max(5, ((safeEnd - safeStart) / total) * 100)

    return {
      left: `${Math.min(left, 95)}%`,
      width: `${Math.min(width, 100 - left)}%`,
    }
  }

  function getWeekLabels() {
    const { start, end } = getGanttRange()
    const totalDays = Math.max(
      1,
      Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    )

    const weekCount = Math.max(4, Math.ceil(totalDays / 7))

    return Array.from({ length: weekCount }, (_, index) => ({
      label: `WEEK ${index + 1}`,
      left: `${(index / weekCount) * 100}%`,
      width: `${100 / weekCount}%`,
    }))
  }

  function getGanttPdfRows() {
    return ganttTasks
      .map((task) => {
        const position = getGanttPosition(task)

        return `
          <div class="gantt-row">
            <div class="gantt-task-name">
              <strong>${escapeHtml(task.task_title)}</strong>
              <span>${escapeHtml(task.student_name || 'Unassigned')}</span>
            </div>

            <div class="gantt-track">
              <div
                class="gantt-bar"
                style="left:${position.left}; width:${position.width};"
              ></div>
            </div>
          </div>
        `
      })
      .join('')
  }

  function handleDownloadEvaluationPdf() {
    const generatedAt = new Date().toLocaleString()
    const weekLabels = getWeekLabels()

    const weekHeaderHtml = weekLabels
      .map(
        (week) => `
          <div
            class="gantt-week"
            style="left:${week.left}; width:${week.width};"
          >
            ${week.label}
          </div>
        `
      )
      .join('')

    const weekLinesHtml = weekLabels
      .map(
        (week) => `
          <div
            class="gantt-line"
            style="left:${week.left};"
          ></div>
        `
      )
      .join('')

    const studentRows = students
      .map((student) => {
        const gradeData = studentGrades[student.student_id] || {}

        return `
          <tr>
            <td>
              <strong>${escapeHtml(student.first_name)} ${escapeHtml(
          student.last_name
        )}</strong><br />
              <span>${escapeHtml(student.email)}</span>
            </td>
            <td>${student.assigned_tasks_count || 0}</td>
            <td>${student.submitted_tasks_count || 0}</td>
            <td>${student.total_uploads_count || 0}</td>
            <td>${student.contribution_score || 0}%</td>
            <td>${getTaskCompletionScore(student)}%</td>
            <td>${gradeData.collaboration_score || 0}</td>
            <td>${gradeData.quality_score || 0}</td>
            <td>${gradeData.ai_suggested_grade || 0}</td>
            <td><strong>${gradeData.teacher_final_grade || 'N/A'}</strong></td>
          </tr>
        `
      })
      .join('')

    const studentDetailsHtml = students
      .map((student) => {
        const gradeData = studentGrades[student.student_id] || {}

        return `
          <section class="student-section">
            <h3>${escapeHtml(student.first_name)} ${escapeHtml(
          student.last_name
        )}</h3>
            <p class="muted">${escapeHtml(student.email)}</p>

            <table>
              <tbody>
                <tr>
                  <th>Contribution Score</th>
                  <td>${student.contribution_score || 0}%</td>
                  <th>Task Completion Score</th>
                  <td>${getTaskCompletionScore(student)}%</td>
                </tr>
                <tr>
                  <th>Assigned Tasks</th>
                  <td>${student.assigned_tasks_count || 0}</td>
                  <th>Submitted Tasks</th>
                  <td>${student.submitted_tasks_count || 0}</td>
                </tr>
                <tr>
                  <th>Total Uploads</th>
                  <td>${student.total_uploads_count || 0}</td>
                  <th>AI Suggested Grade</th>
                  <td>${gradeData.ai_suggested_grade || 0}</td>
                </tr>
                <tr>
                  <th>Collaboration Score</th>
                  <td>${gradeData.collaboration_score || 0}</td>
                  <th>Quality Score</th>
                  <td>${gradeData.quality_score || 0}</td>
                </tr>
                <tr>
                  <th>Teacher Final Grade</th>
                  <td colspan="3"><strong>${
                    gradeData.teacher_final_grade || 'N/A'
                  }</strong></td>
                </tr>
              </tbody>
            </table>

            <div class="note-box">
              <h4>Teacher Notes</h4>
              <p>${escapeHtml(gradeData.teacher_notes || 'No teacher notes.')}</p>
            </div>

            <div class="note-box">
              <h4>AI Explainability</h4>
              <p><strong>Strengths:</strong> ${escapeHtml(
                gradeData.ai_strengths || 'No strengths provided.'
              )}</p>
              <p><strong>Weaknesses:</strong> ${escapeHtml(
                gradeData.ai_weaknesses || 'No weaknesses provided.'
              )}</p>
              <p><strong>Improvement Suggestions:</strong> ${escapeHtml(
                gradeData.ai_improvement_suggestions ||
                  'No suggestions provided.'
              )}</p>
              <p><strong>Confidence Level:</strong> ${escapeHtml(
                gradeData.ai_confidence_level || 'medium'
              )}</p>
            </div>
          </section>
        `
      })
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Evaluation Report</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 40px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              line-height: 1.45;
            }

            .report-header {
              border-bottom: 3px solid #111827;
              padding-bottom: 18px;
              margin-bottom: 28px;
            }

            .eyebrow {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.2em;
              text-transform: uppercase;
              color: #0f766e;
              margin-bottom: 8px;
            }

            h1 {
              font-size: 30px;
              margin: 0;
              font-weight: 900;
            }

            h2 {
              font-size: 20px;
              margin: 30px 0 10px;
              font-weight: 900;
              border-bottom: 1px solid #d1d5db;
              padding-bottom: 6px;
            }

            h3 {
              font-size: 16px;
              margin: 0 0 3px;
              font-weight: 900;
            }

            h4 {
              font-size: 13px;
              margin: 0 0 6px;
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
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              margin-top: 14px;
            }

            .summary-card {
              border: 1px solid #9ca3af;
              border-radius: 10px;
              padding: 12px;
              background: #f8fbff;
            }

            .summary-card strong {
              display: block;
              font-size: 12px;
              margin-bottom: 4px;
            }

            .note-box {
              border: 1px solid #9ca3af;
              border-radius: 10px;
              padding: 12px;
              margin-top: 10px;
              background: #f9fafb;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 11px;
              page-break-inside: auto;
            }

            th {
              border: 1px solid #9ca3af;
              background: #e5e7eb;
              color: #111827;
              text-align: left;
              padding: 8px;
              font-weight: 900;
            }

            td {
              border: 1px solid #9ca3af;
              padding: 8px;
              vertical-align: top;
            }

            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }

            .gantt-wrapper {
              margin-top: 18px;
              border: 1px solid #8ecae6;
              border-radius: 14px;
              overflow: hidden;
              page-break-inside: avoid;
            }

            .gantt-header {
              position: relative;
              height: 42px;
              background: #8ecae6;
            }

            .gantt-week {
              position: absolute;
              top: 0;
              height: 42px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #0674ad;
              font-weight: 900;
              font-size: 14px;
              border-right: 1px solid rgba(255,255,255,0.45);
            }

            .gantt-body {
              position: relative;
              padding: 12px 0;
              background: #ffffff;
            }

            .gantt-line {
              position: absolute;
              top: 0;
              bottom: 0;
              border-left: 3px dashed #8ecae6;
              opacity: 0.9;
            }

            .gantt-row {
              display: grid;
              grid-template-columns: 220px 1fr;
              min-height: 32px;
              position: relative;
              z-index: 2;
            }

            .gantt-task-name {
              padding: 6px 12px;
              text-align: right;
              color: #1682bd;
              font-size: 10px;
            }

            .gantt-task-name strong {
              display: block;
              font-weight: 900;
            }

            .gantt-task-name span {
              display: block;
              color: #6b7280;
              font-size: 9px;
            }

            .gantt-track {
              position: relative;
              margin-right: 16px;
            }

            .gantt-bar {
              position: absolute;
              top: 10px;
              height: 10px;
              border-radius: 999px;
              background: linear-gradient(90deg, #ff5f66, #ff9aa2);
            }

            .student-section {
              page-break-inside: avoid;
              border: 1px solid #9ca3af;
              border-radius: 12px;
              padding: 14px;
              margin-top: 14px;
            }

            .footer {
              margin-top: 30px;
              padding-top: 12px;
              border-top: 1px solid #d1d5db;
              color: #6b7280;
              font-size: 11px;
            }

            @media print {
              body {
                padding: 24px;
              }

              button {
                display: none;
              }

              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>

        <body>
          <header class="report-header">
            <div class="eyebrow">Teacher Evaluation Report</div>
            <h1>Project Group Evaluation</h1>
            <p class="muted">Generated on ${escapeHtml(generatedAt)}</p>
          </header>

          <section>
            <h2>Evaluation Overview</h2>

            <div class="summary-grid">
              <div class="summary-card">
                <strong>Evaluation Status</strong>
                <p>${escapeHtml(evaluation?.status || 'draft')}</p>
              </div>

              <div class="summary-card">
                <strong>Total Students</strong>
                <p>${students.length}</p>
              </div>

              <div class="summary-card">
                <strong>Total Timeline Tasks</strong>
                <p>${ganttTasks.length}</p>
              </div>

              <div class="summary-card">
                <strong>Evaluation ID</strong>
                <p>${escapeHtml(evaluation?.id || 'N/A')}</p>
              </div>
            </div>

            <div class="note-box">
              <h4>AI Summary</h4>
              <p>${escapeHtml(
                evaluation?.ai_summary || 'AI evaluation not generated yet.'
              )}</p>
            </div>
          </section>

          <section>
            <h2>Student Grade Summary</h2>

            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assigned</th>
                  <th>Submitted</th>
                  <th>Uploads</th>
                  <th>Contribution</th>
                  <th>Task Completion</th>
                  <th>Collaboration</th>
                  <th>Quality</th>
                  <th>AI Grade</th>
                  <th>Final Grade</th>
                </tr>
              </thead>
              <tbody>
                ${studentRows}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Project Gantt Chart</h2>

            ${
              ganttTasks.length === 0
                ? '<p class="muted">No task timeline data available.</p>'
                : `
                  <div class="gantt-wrapper">
                    <div class="gantt-header">
                      ${weekHeaderHtml}
                    </div>
                    <div class="gantt-body">
                      ${weekLinesHtml}
                      ${getGanttPdfRows()}
                    </div>
                  </div>
                `
            }
          </section>

          <section class="page-break">
            <h2>Detailed Student Evaluations</h2>
            ${studentDetailsHtml}
          </section>

          <footer class="footer">
            This report was generated from the teacher evaluation module.
          </footer>

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

  const weekLabels = getWeekLabels()

const filteredStudents = students.filter((student) => {
  const fullName = `${student.first_name || ''} ${
    student.last_name || ''
  }`.toLowerCase()

  const email = String(student.email || '').toLowerCase()
  const search = studentSearch.toLowerCase()

  return fullName.includes(search) || email.includes(search)
})

  return (
    <DashboardLayout
      title="Teacher Panel"
      pageTitle="Evaluation Details"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              to="/teacher/evaluation"
              className="inline-flex items-center gap-2 rounded-xl border border-[#00CFC8]/40 bg-white px-4 py-2 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
            >
              <ChevronLeft size={18} />
              Back to Evaluation
            </Link>

            <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
              Evaluation Details
            </h1>

            <p className="mt-2 max-w-3xl text-gray-500">
              Review student contribution analytics and enter final grades.
            </p>
          </div>

          {!loading && students.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadEvaluationPdf}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 text-sm font-black text-black transition-all hover:opacity-90"
            >
              <Download size={18} />
              Download PDF
            </button>
          )}
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading evaluation details...</p>
        ) : students.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
            No students found for this group.
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-2xl font-black text-black">
                  Evaluation Status
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Generate AI suggestions, then review and finalize grades.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-4">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="mt-1 font-black text-[#00B8B0]">
                    {evaluation?.status || 'draft'}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                  <p className="text-sm text-gray-500">AI Summary</p>
                  <p className="mt-1 break-words text-sm font-semibold text-gray-800">
                    {evaluation?.ai_summary ||
                      'AI evaluation not generated yet.'}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <button
                  onClick={handleGenerateAiEvaluation}
                  disabled={
                    generatingAiEvaluation || evaluation?.status === 'finalized'
                  }
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generatingAiEvaluation
                    ? 'Generating AI Evaluation...'
                    : 'Generate AI Evaluation'}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-2xl font-black text-black">
                  Project Gantt Chart
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Timeline view of completed project tasks.
                </p>
              </div>

              {ganttTasks.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center text-gray-500">
                  No task timeline data available.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-3xl border border-gray-400 bg-white">
                  <div className="min-w-[1100px]">
                    <div className="grid grid-cols-[260px_1fr]">
                      <div className="bg-[#8ecae6]" />

                      <div className="relative h-14 bg-[#8ecae6]">
                        {weekLabels.map((week) => (
                          <div
                            key={week.label}
                            className="absolute top-0 flex h-14 items-center justify-center border-r border-white/50 text-lg font-black text-[#0674ad]"
                            style={{
                              left: week.left,
                              width: week.width,
                            }}
                          >
                            {week.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute left-[260px] right-0 top-0 bottom-0">
                        {weekLabels.map((week) => (
                          <div
                            key={week.label}
                            className="absolute top-0 bottom-0 border-l-4 border-dashed border-[#8ecae6]"
                            style={{ left: week.left }}
                          />
                        ))}
                      </div>

                      {ganttTasks.map((task) => {
                        const position = getGanttPosition(task)

                        return (
                          <div
                            key={task.task_id}
                            className="grid min-h-[42px] grid-cols-[260px_1fr] items-center"
                          >
                            <div className="z-10 px-4 py-2 text-right">
                              <p className="break-words text-sm font-black text-[#1682bd]">
                                {task.task_title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {task.student_name || 'Unassigned'}
                              </p>
                            </div>

                            <div className="relative z-10 h-full">
                              <div
                                className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-gradient-to-r from-red-400 to-red-300"
                                style={{
                                  left: position.left,
                                  width: position.width,
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}

                      <div className="grid grid-cols-[260px_1fr] border-t border-gray-200">
                        <div />

                        <div className="relative h-10">
                          {weekLabels.map((week, index) => (
                            <div
                              key={week.label}
                              className="absolute top-2 text-sm font-black text-[#1682bd]"
                              style={{ left: week.left }}
                            >
                              Day {index * 7 + 1}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-2xl font-black text-black">
                  Student Evaluation
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Teacher can override AI grades before finalizing.
                </p>

<input
  value={studentSearch}
  onChange={(e) => setStudentSearch(e.target.value)}
  placeholder="Search student name or email..."
  className="mt-5 h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8] lg:w-96"
/>
              </div>

              <div className="mt-5 space-y-4">
                {filteredStudents.map((student) => {
                  const gradeData = studentGrades[student.student_id] || {}

                  return (
                    <div
                      key={student.student_id}
                      className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <h3 className="break-words text-xl font-black text-gray-900">
                            {student.first_name} {student.last_name}
                          </h3>
                          <p className="break-all text-sm text-gray-500">
                            {student.email}
                          </p>
                        </div>

                        <span className="w-fit rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0]">
                          Contribution: {student.contribution_score}%
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm lg:grid-cols-5">
                        <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                          <p className="text-gray-500">Assigned Tasks</p>
                          <p className="font-bold text-gray-900">
                            {student.assigned_tasks_count}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                          <p className="text-gray-500">Submitted Tasks</p>
                          <p className="font-bold text-gray-900">
                            {student.submitted_tasks_count}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                          <p className="text-gray-500">Uploads</p>
                          <p className="font-bold text-gray-900">
                            {student.total_uploads_count}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                          <p className="text-gray-500">Collaboration</p>
                          <p className="font-bold text-gray-900">
                            {gradeData.collaboration_score || 0}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                          <p className="text-gray-500">AI Suggested Grade</p>
                          <p className="font-bold text-gray-900">
                            {gradeData.ai_suggested_grade || 0}
                          </p>
                        </div>
                      </div>

                      {(gradeData.ai_strengths ||
                        gradeData.ai_weaknesses ||
                        gradeData.ai_improvement_suggestions) && (
                        <div className="mt-5 rounded-2xl border border-gray-400 bg-[#F8FBFF] p-4">
                          <h4 className="mb-3 font-black text-gray-900">
                            AI Explainability
                          </h4>

                          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                            <div className="rounded-2xl border border-gray-400 bg-white p-3">
                              <p className="font-bold text-gray-900">
                                Strengths
                              </p>
                              <p className="mt-1 break-words text-gray-600">
                                {gradeData.ai_strengths ||
                                  'No strengths provided.'}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-gray-400 bg-white p-3">
                              <p className="font-bold text-gray-900">
                                Weaknesses
                              </p>
                              <p className="mt-1 break-words text-gray-600">
                                {gradeData.ai_weaknesses ||
                                  'No weaknesses provided.'}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-gray-400 bg-white p-3">
                              <p className="font-bold text-gray-900">
                                Improvement Suggestions
                              </p>
                              <p className="mt-1 break-words text-gray-600">
                                {gradeData.ai_improvement_suggestions ||
                                  'No suggestions provided.'}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-gray-400 bg-white p-3">
                              <p className="font-bold text-gray-900">
                                Confidence Level
                              </p>
                              <p className="mt-1 capitalize text-gray-600">
                                {gradeData.ai_confidence_level || 'medium'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Teacher Final Grade
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={gradeData.teacher_final_grade || ''}
                            onChange={(e) =>
                              handleGradeChange(
                                student.student_id,
                                'teacher_final_grade',
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                            placeholder="0 - 100"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Teacher Notes
                          </label>
                          <textarea
                            value={gradeData.teacher_notes || ''}
                            onChange={(e) =>
                              handleGradeChange(
                                student.student_id,
                                'teacher_notes',
                                e.target.value
                              )
                            }
                            className="min-h-24 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                            placeholder="Optional notes"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleSaveDraft}
                  disabled={evaluation?.status === 'finalized'}
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Draft
                </button>

                <button
                  onClick={handleFinalize}
                  disabled={evaluation?.status === 'finalized'}
                  className="rounded-xl border border-[#00CFC8]/40 bg-white px-5 py-3 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Finalize Evaluation
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default TeacherEvaluationDetailsPage