import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function ProtectedRoute({
  children,
  allowedRoles,
  requireOnboarding = true,
}) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    checkUser()
  }, [])

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setLoading(false)
      return
    }

    setSession(session)

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setProfile(profileData)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        Loading...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" />
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/login" />
  }

  if (
    requireOnboarding &&
    profile.role === 'student' &&
    !profile.is_onboarded
  ) {
    return <Navigate to="/student/onboarding" />
  }

  return children
}

export default ProtectedRoute