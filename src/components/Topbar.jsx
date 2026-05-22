import { useEffect, useState } from 'react'
import { Menu, Bell } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

function Topbar({  onOpenMobileMenu }) {
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchNotifications()
  }, [])

  useEffect(() => {
    if (!currentUser?.id) return

    const channel = supabase
      .channel(`notifications-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          setNotifications((current) => [payload.new, ...current])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id])

  async function fetchNotifications() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setCurrentUser(user)

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    setNotifications(data || [])
  }

  async function markAsRead(notificationId) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      )
    )
  }

  async function markAllAsRead() {
    if (!currentUser?.id) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false)

    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true }))
    )
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length

  return (
    <header className="h-16 border-b border-white/10 bg-[#001A5A]/95 backdrop-blur-md text-white flex items-center justify-between px-4 md:px-6 fixed top-0 left-0 md:left-64 right-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden border border-white/20 rounded-xl p-2 hover:bg-white/10"
        >
          <Menu size={20} />
        </button>

        <div>
          <p className="text-xs text-cyan-300 font-semibold uppercase tracking-widest">
            Collabify
          </p>

        </div>
      </div>

      <div className="flex items-center gap-3 relative">
        <button
          onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          className="relative border border-white/20 rounded-xl p-2 hover:bg-white/10"
        >
          <Bell size={18} />

          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-gradient-to-r from-cyan-400 to-green-400 text-black text-xs font-black rounded-full min-w-5 h-5 flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </button>

        {isNotificationOpen && (
          <div className="absolute right-20 top-12 w-80 bg-[#001A5A] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="font-black">Notifications</h3>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-cyan-300 font-semibold"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-sm text-gray-300 text-center">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`w-full text-left border-b border-white/10 p-4 hover:bg-white/10 ${
                      notification.is_read ? 'bg-transparent' : 'bg-white/10'
                    }`}
                  >
                    <p className="font-semibold text-sm text-white">
                      {notification.title}
                    </p>

                    <p className="text-sm text-gray-300 mt-1">
                      {notification.message}
                    </p>

                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="bg-gradient-to-r from-cyan-400 to-green-400 text-black px-4 py-2 rounded-xl text-sm font-black hover:scale-105 transition-transform"
        >
          Logout
        </button>
      </div>
    </header>
  )
}

export default Topbar