export default function UsernameSection({
  username,
  value,
  setValue,
  onSave,
  saving,
  error,
  success,
}: any) {

  const locked = !!username

  return (
    <section className="mb-8">
      <h2 className="font-semibold mb-1">Username</h2>

      <input
        className="border p-2 w-full mb-2 disabled:bg-gray-100"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={locked || saving}
      />

      {locked && (
        <p className="text-xs text-gray-500">
          Your username is permanent and cannot be changed.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="text-sm text-green-600">
          Username saved successfully
        </p>
      )}

      {!locked && (
        <button
          onClick={onSave}
          disabled={saving}
          className="mt-2 bg-black text-white px-4 py-2"
        >
          Save Username
        </button>
      )}
    </section>
  )
}
