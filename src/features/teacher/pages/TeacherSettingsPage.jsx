import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'

function TeacherSettingsPage() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    employee_id: '',
    phone_number: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmPassword: false,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchProfile()
  }, [])

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

    setProfile({
      first_name: data?.first_name || '',
      last_name: data?.last_name || '',
      email: data?.email || user.email || '',
      department: data?.department || '',
      employee_id: data?.employee_id || '',
      phone_number: data?.phone_number || '',
    })

    setLoading(false)
  }

  function handleProfileChange(e) {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    })
  }

  function handlePasswordChange(e) {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value,
    })
  }

  function togglePasswordVisibility(field) {
    setShowPassword({
      ...showPassword,
      [field]: !showPassword[field],
    })
  }

  async function handleSaveProfile(e) {
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
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        department: profile.department,
        employee_id: profile.employee_id,
        phone_number: profile.phone_number,
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
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
    setMessage('')

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage('Please fill in both password fields.')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setUpdatingPassword(true)

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

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Settings"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div>

          <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
            Settings
          </h1>

          <p className="mt-2 max-w-3xl text-gray-500">
            Manage your teacher profile and account security.
          </p>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading settings...</p>
        ) : (
          <>
            <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-[#001A5A] text-4xl font-black text-white shadow-sm">
                  {(profile.first_name?.[0] || 'T').toUpperCase()}
                </div>

                <div>
                  <h2 className="text-2xl font-black text-black">
                    Profile Information
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Update your teacher details.
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#00B8B0]">
                    {profile.email}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      First Name
                    </label>

                    <input
                      name="first_name"
                      value={profile.first_name}
                      onChange={handleProfileChange}
                      placeholder="First name"
                      className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Last Name
                    </label>

                    <input
                      name="last_name"
                      value={profile.last_name}
                      onChange={handleProfileChange}
                      placeholder="Last name"
                      className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Email
                    </label>

                    <input
                      name="email"
                      type="email"
                      value={profile.email}
                      onChange={handleProfileChange}
                      placeholder="Email"
                      className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Department
                    </label>

                    <input
                      name="department"
                      value={profile.department}
                      onChange={handleProfileChange}
                      placeholder="Department"
                      className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Employee ID
                    </label>

                    <input
                      name="employee_id"
                      value={profile.employee_id}
                      onChange={handleProfileChange}
                      placeholder="Employee ID"
                      className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Phone Number
                    </label>

                    <input
                      name="phone_number"
                      value={profile.phone_number}
                      onChange={handleProfileChange}
                      placeholder="Phone number"
                      className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />
                  </div>
                </div>

                <button
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-2xl font-black text-black">
                  Change Password
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Update your account password.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    New Password
                  </label>

                  <div className="relative">
                    <input
                      name="newPassword"
                      type={showPassword.newPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="New password"
                      className="w-full rounded-xl border border-gray-300 bg-white p-3 pr-12 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />

                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('newPassword')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
                    >
                      {showPassword.newPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Confirm New Password
                  </label>

                  <div className="relative">
                    <input
                      name="confirmPassword"
                      type={
                        showPassword.confirmPassword ? 'text' : 'password'
                      }
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                      className="w-full rounded-xl border border-gray-300 bg-white p-3 pr-12 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        togglePasswordVisibility('confirmPassword')
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
                    >
                      {showPassword.confirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  disabled={updatingPassword}
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {updatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-2xl font-black text-black">
                  Account
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Sign out of your teacher account.
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="mt-5 rounded-xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default TeacherSettingsPage