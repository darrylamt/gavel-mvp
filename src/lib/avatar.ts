export function getAvatarLetter(username?: string | null) {
  if (!username) return '?'
  return username.charAt(0).toUpperCase()
}