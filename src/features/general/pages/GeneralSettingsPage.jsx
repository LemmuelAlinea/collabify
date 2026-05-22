import { useEffect, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { supabase } from '../../../lib/supabaseClient'
import { PageSkeleton } from '../../../components/ui/Skeleton'
import {
  generalManagerNavigation,
  generalMemberNavigation,
  generalSponsorNavigation,
} from '../config/generalNavigation'

function GeneralSettingsPage({ roleType }) {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  function getNavigation() {
    if (roleType === 'project_manager') return generalManagerNavigation
    if (roleType === 'project_sponsor') return generalSponsorNavigation
    return generalMemberNavigation
  }

  function getRoleLabel() {
    if (roleType === 'project_manager') return 'Project Manager'
    if (roleType === 'project_sponsor') return 'Project Sponsor'
    return 'Project Member'
  }

  async function fetchProfile() {
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

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setProfile(data)

    setForm({
      firstName: data?.first_name || '',
      lastName: data?.last_name || '',
      email: data?.email || user.email || '',
    })

    setLoading(false)
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  function handlePasswordChange(e) {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value,
    })
  }

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('User not found.')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage('Profile updated successfully.')
    setSaving(false)
    fetchProfile()
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
    setUpdatingPassword(true)
    setMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('Passwords do not match.')
      setUpdatingPassword(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.')
      setUpdatingPassword(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    })

    if (error) {
      setMessage(error.message)
      setUpdatingPassword(false)
      return
    }

    setPasswordForm({
      newPassword: '',
      confirmPassword: '',
    })

    setMessage('Password updated successfully.')
    setUpdatingPassword(false)
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Collabify"
        pageTitle="Settings"
        navigation={getNavigation()}
      >
        <PageSkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Settings"
      navigation={getNavigation()}
    >
      <div className="space-y-6 text-gray-900">
        <div>

          <h1 className="text-4xl font-black mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-transparent">
            Profile
          </h1>

          <p className="mt-2 text-black">
            Manage your general workplace profile and account security.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 to-green-400 text-4xl font-black text-black shadow-lg">
                {form.firstName?.[0] || 'U'}
              </div>

              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                {form.firstName} {form.lastName}
              </h2>

              <p className="mt-1 text-gray-500">{form.email}</p>

              <div className="mt-4 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-semibold text-[#001A5A]">
                {getRoleLabel()}
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-400">Account Role</p>
                <p className="font-semibold text-gray-900">
                  {profile?.role}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-gray-400">Created At</p>
                <p className="font-semibold text-gray-900">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleString()
                    : 'Not available'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 xl:col-span-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Profile Information
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Update your displayed name and email.
              </p>

              <form
                onSubmit={handleUpdateProfile}
                className="mt-5 space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#001A5A]"
                    required
                  />

                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#001A5A]"
                    required
                  />
                </div>

                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#001A5A]"
                  required
                />

                <button
                  disabled={saving}
                  className="rounded-xl bg-[#001A5A] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#002A8A] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Change Password
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Update your account password.
              </p>

              <form
                onSubmit={handleUpdatePassword}
                className="mt-5 space-y-4"
              >
                <input
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="New password"
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#001A5A]"
                  required
                />

                <input
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#001A5A]"
                  required
                />

                <button
                  disabled={updatingPassword}
                  className="rounded-xl bg-[#001A5A] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#002A8A] disabled:opacity-50"
                >
                  {updatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default GeneralSettingsPage