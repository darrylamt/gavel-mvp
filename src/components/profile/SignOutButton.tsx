import { supabase } from '@/lib/supabaseClient'

export default function SignOutButton() {
  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <button
      onClick={signOut}
      className="w-full border py-2 rounded text-red-600 mt-10"
    >
      Sign Out
    </button>
  )
}
