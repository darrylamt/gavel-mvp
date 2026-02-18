import { supabase } from '@/lib/supabaseClient'

export default function SignOutButton() {
  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <button
      onClick={signOut}
      className="mt-6 inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
    >
      Sign Out
    </button>
  )
}
