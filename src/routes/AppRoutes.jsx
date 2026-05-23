import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'

import LoginPage from '../features/auth/pages/LoginPage'
import RegisterPage from '../features/auth/pages/RegisterPage'
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage'
import StudentDashboard from '../features/student/pages/StudentDashboard'
import TeacherDashboard from '../features/teacher/pages/TeacherDashboard'
import AdminLoginPage from '../features/admin/pages/AdminLoginPage'
import AdminDashboard from '../features/admin/pages/AdminDashboard'
import AdminStoragePage from '../features/admin/pages/AdminStoragePage'
import AdminPlatformAnalyticsPage from '../features/admin/pages/AdminPlatformAnalyticsPage'
import AdminReportsPage from '../features/admin/pages/AdminReportsPage'
import AdminSystemLogsPage from '../features/admin/pages/AdminSystemLogsPage'
import AdminProfilePage from '../features/admin/pages/AdminProfilePage'
import StudentOnboardingPage from '../features/onboarding/pages/StudentOnboardingPage'
import ProtectedRoute from './ProtectedRoute'

import StudentClassesPage from '../features/student/pages/StudentClassesPage'
import StudentTasksPage from '../features/student/pages/StudentTasksPage'
import StudentAnalyticsPage from '../features/student/pages/StudentAnalyticsPage'
import StudentSettingsPage from '../features/student/pages/StudentSettingsPage'
import StudentTaskDetailsPage from '../features/student/pages/StudentTaskDetailsPage'

import TeacherClassesPage from '../features/teacher/pages/TeacherClassesPage'
import TeacherAnalyticsPage from '../features/teacher/pages/TeacherAnalyticsPage'
import TeacherEvaluationPage from '../features/teacher/pages/TeacherEvaluationPage'
import TeacherReassignmentsPage from '../features/teacher/pages/TeacherReassignmentsPage'
import TeacherAIAssistantPage from '../features/teacher/pages/TeacherAIAssistantPage'
import TeacherProjectGroupDetailsPage from '../features/teacher/pages/TeacherProjectGroupDetailsPage'
import TeacherReportsPage from '../features/teacher/pages/TeacherReportPage'
import TeacherTaskDetailsPage from '../features/teacher/pages/TeacherTaskDetailsPage'
import TeacherSettingsPage from '../features/teacher/pages/TeacherSettingsPage'
import StudentGroupChatPage from '../features/student/pages/StudentGroupChatPage'

import CreateClassPage from '../features/teacher/pages/CreateClassPage'
import TeacherClassDetailsPage from '../features/teacher/pages/TeacherClassDetailsPage'
import StudentClassDetailsPage from '../features/student/pages/StudentClassDetailsPage'
import CreateProjectPage from '../features/teacher/pages/CreateProjectPage'
import TeacherProjectDetailsPage from '../features/teacher/pages/TeacherProjectDetailsPage'
import StudentProjectDetailsPage from '../features/student/pages/StudentProjectDetailsPage'
import TeacherProjectAnalyticsPage from '../features/teacher/pages/TeacherProjectAnalyticsPage'
import TeacherEvaluationDetailsPage from '../features/teacher/pages/TeacherEvaluationDetailsPage'
import StudentEvaluationResultsPage from '../features/student/pages/StudentEvaluationResultsPage'

import GeneralManagerDashboard from '../features/general/pages/GeneralManagerDashboard'
import GeneralSponsorDashboard from '../features/general/pages/GeneralSponsorDashboard'
import GeneralMemberDashboard from '../features/general/pages/GeneralMemberDashboard'
import GeneralLoginPage from '../features/general/pages/GeneralLoginPage'
import GeneralRegisterPage from '../features/general/pages/GeneralRegisterPage'
import GeneralManagerProjectsPage from '../features/general/pages/GeneralManagerProjectsPage'
import GeneralCreateProjectPage from '../features/general/pages/GeneralCreateProjectPage'
import GeneralManagerProjectDetailsPage from '../features/general/pages/GeneralManagerProjectDetailsPage'
import GeneralMemberProjectsPage from '../features/general/pages/GeneralMemberProjectsPage'
import GeneralMemberProjectDetailsPage from '../features/general/pages/GeneralMemberProjectDetailsPage'
import GeneralMemberTasksPage from '../features/general/pages/GeneralMemberTasksPage'
import GeneralSponsorProjectsPage from '../features/general/pages/GeneralSponsorProjectsPage'
import GeneralSponsorProjectDetailsPage from '../features/general/pages/GeneralSponsorProjectDetailsPage'
import GeneralManagerAnalyticsPage from '../features/general/pages/GeneralManagerAnalyticsPage'
import GeneralMemberAnalyticsPage from '../features/general/pages/GeneralMemberAnalyticsPage'
import GeneralSponsorAnalyticsPage from '../features/general/pages/GeneralSponsorAnalyticsPage'
import GeneralManagerAIAssistantPage from '../features/general/pages/GeneralManagerAIAssistantPage'
import GeneralSettingsPage from '../features/general/pages/GeneralSettingsPage'
import GeneralSponsorApprovalsPage from '../features/general/pages/GeneralSponsorApprovalsPage'
import GeneralTaskDetailsPage from '../features/general/pages/GeneralTaskDetailsPage'
import GeneralManagerEvaluationPage from '../features/general/pages/GeneralManagerEvaluationPage'
import GeneralReportsPage from '../features/general/pages/GeneralReportsPage'
import GeneralProjectChatPage from '../features/general/pages/GeneralProjectChatPage'

import AdminAIMonitoringPage from '../features/admin/pages/AdminAIMonitoringPage'
import AdminSettingsPage from '../features/admin/pages/AdminSettingsPage'


import AuthCallbackPage from '../features/auth/pages/AuthCallbackPage'
function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/general/login" element={<GeneralLoginPage />} />
        <Route path="/general/register" element={<GeneralRegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />

        <Route
          path="/student/onboarding"
          element={
            <ProtectedRoute allowedRoles={['student']} requireOnboarding={false}>
              <StudentOnboardingPage />
            </ProtectedRoute>
          }
        />

        <Route
  path="/admin/logs"
  element={
    <ProtectedRoute allowedRoles={['platform_admin']}>
      <AdminSystemLogsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/ai-monitoring"
  element={
    <ProtectedRoute allowedRoles={['platform_admin']}>
      <AdminAIMonitoringPage />
    </ProtectedRoute>
  }
/>
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['platform_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/classes"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentClassesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/classes/:classId"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentClassDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/projects/:projectId"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentProjectDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/tasks"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentTasksPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/evaluations"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentEvaluationResultsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/analytics"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/settings"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentSettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/classes"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherClassesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/classes/create"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <CreateClassPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/classes/:classId"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherClassDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/classes/:classId/projects/create"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <CreateProjectPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/projects/:projectId"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherProjectDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/analytics"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/analytics/projects/:projectId"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherProjectAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/evaluation"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherEvaluationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/evaluation/projects/:projectId/groups/:groupId"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherEvaluationDetailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/reassignments"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherReassignmentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/ai-assistant"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherAIAssistantPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/settings"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherSettingsPage />
            </ProtectedRoute>
          }
        />

<Route
  path="/general/manager/dashboard"
  element={
    <ProtectedRoute allowedRoles={['project_manager']}>
      <GeneralManagerDashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/sponsor/dashboard"
  element={
    <ProtectedRoute allowedRoles={['project_sponsor']}>
      <GeneralSponsorDashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/member/dashboard"
  element={
    <ProtectedRoute allowedRoles={['project_member']}>
      <GeneralMemberDashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/manager/projects"
  element={
    <ProtectedRoute allowedRoles={['project_manager']}>
      <GeneralManagerProjectsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/manager/projects/create"
  element={
    <ProtectedRoute allowedRoles={['project_manager']}>
      <GeneralCreateProjectPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/manager/projects/:projectId"
  element={
    <ProtectedRoute allowedRoles={['project_manager']}>
      <GeneralManagerProjectDetailsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/member/projects"
  element={
    <ProtectedRoute allowedRoles={['project_member']}>
      <GeneralMemberProjectsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/member/projects/:projectId"
  element={
    <ProtectedRoute allowedRoles={['project_member']}>
      <GeneralMemberProjectDetailsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/member/tasks"
  element={
    <ProtectedRoute allowedRoles={['project_member']}>
      <GeneralMemberTasksPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/sponsor/projects"
  element={
    <ProtectedRoute allowedRoles={['project_sponsor']}>
      <GeneralSponsorProjectsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/sponsor/projects/:projectId"
  element={
    <ProtectedRoute allowedRoles={['project_sponsor']}>
      <GeneralSponsorProjectDetailsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/manager/analytics"
  element={
    <ProtectedRoute allowedRoles={['project_manager']}>
      <GeneralManagerAnalyticsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/member/analytics"
  element={
    <ProtectedRoute allowedRoles={['project_member']}>
      <GeneralMemberAnalyticsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/sponsor/analytics"
  element={
    <ProtectedRoute allowedRoles={['project_sponsor']}>
      <GeneralSponsorAnalyticsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/manager/ai-assistant"
  element={
    <ProtectedRoute allowedRoles={['project_manager']}>
      <GeneralManagerAIAssistantPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/manager/settings"
  element={
    <ProtectedRoute allowedRoles={['project_manager']}>
      <GeneralSettingsPage roleType="project_manager" />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/member/settings"
  element={
    <ProtectedRoute allowedRoles={['project_member']}>
      <GeneralSettingsPage roleType="project_member" />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/sponsor/settings"
  element={
    <ProtectedRoute allowedRoles={['project_sponsor']}>
      <GeneralSettingsPage roleType="project_sponsor" />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/sponsor/approvals"
  element={
    <ProtectedRoute allowedRoles={['project_sponsor']}>
      <GeneralSponsorApprovalsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/manager/projects/:projectId/tasks/:taskId"
  element={
    <ProtectedRoute allowedRoles={['project_manager']}>
      <GeneralTaskDetailsPage roleType="manager" />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/sponsor/projects/:projectId/tasks/:taskId"
  element={
    <ProtectedRoute allowedRoles={['project_sponsor']}>
      <GeneralTaskDetailsPage roleType="sponsor" />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/member/projects/:projectId/tasks/:taskId"
  element={
    <ProtectedRoute allowedRoles={['project_member']}>
      <GeneralTaskDetailsPage roleType="member" />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/manager/evaluation"
  element={
    <ProtectedRoute allowedRoles={['project_manager']}>
      <GeneralManagerEvaluationPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/student/tasks/:taskId"
  element={
    <ProtectedRoute allowedRoles={['student']}>
      <StudentTaskDetailsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/teacher/projects/:projectId/groups/:groupId"
  element={
    <ProtectedRoute allowedRoles={['teacher']}>
      <TeacherProjectGroupDetailsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/teacher/reports"
  element={
    <ProtectedRoute allowedRoles={['teacher']}>
      <TeacherReportsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/manager/reports"
  element={
    <ProtectedRoute allowedRoles={['project_manager']}>
      <GeneralReportsPage roleType="manager" />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/sponsor/reports"
  element={
    <ProtectedRoute allowedRoles={['project_sponsor']}>
      <GeneralReportsPage roleType="sponsor" />
    </ProtectedRoute>
  }
/>

<Route
  path="/student/groups/:groupId/chat"
  element={
    <ProtectedRoute allowedRoles={['student']}>
      <StudentGroupChatPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/manager/projects/:projectId/chat"
  element={
    <ProtectedRoute allowedRoles={['project_manager']}>
      <GeneralProjectChatPage roleType="manager" />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/member/projects/:projectId/chat"
  element={
    <ProtectedRoute allowedRoles={['project_member']}>
      <GeneralProjectChatPage roleType="member" />
    </ProtectedRoute>
  }
/>

<Route
  path="/general/sponsor/projects/:projectId/chat"
  element={
    <ProtectedRoute allowedRoles={['project_sponsor']}>
      <GeneralProjectChatPage roleType="sponsor" />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/dashboard"
  element={
    <ProtectedRoute allowedRoles={['platform_admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/settings"
  element={
    <ProtectedRoute allowedRoles={['platform_admin']}>
      <AdminSettingsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/storage"
  element={
    <ProtectedRoute allowedRoles={['platform_admin']}>
      <AdminStoragePage />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/analytics"
  element={
    <ProtectedRoute allowedRoles={['platform_admin']}>
      <AdminPlatformAnalyticsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/reports"
  element={
    <ProtectedRoute allowedRoles={['platform_admin']}>
      <AdminReportsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/profile"
  element={
    <ProtectedRoute allowedRoles={['platform_admin']}>
      <AdminProfilePage />
    </ProtectedRoute>
  }
/>

<Route
  path="/teacher/tasks/:taskId"
  element={
    <ProtectedRoute allowedRoles={['teacher']}>
      <TeacherTaskDetailsPage />
    </ProtectedRoute>
  }
/>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes