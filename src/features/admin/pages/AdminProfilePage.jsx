import { useEffect, useState } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import SectionHeader from '../../../components/ui/SectionHeader'
import { adminNavigation } from '../config/adminNavigation'
import { supabase } from '../../../lib/supabaseClient'

function AdminProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState(null)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    department: '',
    employee_id: '',
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchProfile()
  }, [])

  async function fetchProfile() {
    setLoading(true)
    setMessage('')

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      setMessage('Admin user not found.')
      setLoading(false)
      return
    }

    setUser(authUser)

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'first_name, last_name, email, phone_number, department, employee_id, role'
      )
      .eq('id', authUser.id)
      .maybeSingle()

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (data?.role !== 'platform_admin') {
      setMessage('This profile page is only available to platform admins.')
      setLoading(false)
      return
    }

    setForm({
      first_name: data?.first_name || '',
      last_name: data?.last_name || '',
      email: data?.email || authUser.email || '',
      phone_number: data?.phone_number || '',
      department: data?.department || '',
      employee_id: data?.employee_id || '',
    })

    setLoading(false)
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone_number: form.phone_number || null,
        department: form.department || null,
        employee_id: form.employee_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .eq('role', 'platform_admin')

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage('Admin profile updated successfully.')
    setSaving(false)
  }

  async function handlePasswordReset() {
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Password reset email sent.')
  }

  return (
    <DashboardLayout
      title="Collabify Admin"
      pageTitle="Profile"
      navigation={adminNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Admin Profile"
            description="Manage your platform administrator profile information."
          />
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading admin profile...</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-green-400 text-4xl font-black text-black">
                  {(form.first_name?.[0] || 'A').toUpperCase()}
                </div>

                <h2 className="mt-4 text-2xl font-black text-gray-900">
                  {form.first_name || 'Platform'} {form.last_name || 'Admin'}
                </h2>

                <p className="mt-1 text-sm text-gray-500">{form.email}</p>

                <span className="mt-4 rounded-full border border-[#00CFC8]/40 bg-[#F8FBFF] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#00B8B0]">
                  Platform Admin
                </span>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4">
                  <p className="text-gray-500">Department</p>
                  <p className="font-black text-gray-900">
                    {form.department || 'Not set'}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-300 bg-[#F8FBFF] p-4">
                  <p className="text-gray-500">Employee ID</p>
                  <p className="font-black text-gray-900">
                    {form.employee_id || 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-400 bg-white p-6 shadow-sm">
              <SectionHeader
                title="Profile Information"
                description="Update only your own admin profile."
              />

              <form onSubmit={handleSave} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-600">
                      First Name
                    </span>
                    <input
                      name="first_name"
                      value={form.first_name}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-600">
                      Last Name
                    </span>
                    <input
                      name="last_name"
                      value={form.last_name}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-600">
                      Email
                    </span>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-600">
                      Phone Number
                    </span>
                    <input
                      name="phone_number"
                      value={form.phone_number}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#00CFC8]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-600">
                      Department
                    </span>
                    <input
                      name="department"
                      value={form.department}
                      onChange={handleChange}
                      placeholder="Platform Operations"
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-600">
                      Employee ID
                    </span>
                    <input
                      name="employee_id"
                      value={form.employee_id}
                      onChange={handleChange}
                      placeholder="ADMIN-001"
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#00CFC8]"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    disabled={saving}
                    className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>

                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="rounded-xl border border-[#00CFC8]/40 bg-white px-5 py-3 text-sm font-semibold text-[#00B8B0] transition-all hover:bg-gray-50"
                  >
                    Send Password Reset Email
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default AdminProfilePage