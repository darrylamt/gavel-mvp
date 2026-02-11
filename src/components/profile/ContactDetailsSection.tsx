type Props = {
  phone: string
  address: string
  onPhoneChange: (v: string) => void
  onAddressChange: (v: string) => void
  onSave: () => void
  saving: boolean
}

export default function ContactDetailsSection({
  phone,
  address,
  onPhoneChange,
  onAddressChange,
  onSave,
  saving,
}: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">
        Contact Details
      </h2>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Phone Number
        </label>
        <input
          type="text"
          value={phone}
          onChange={(e) =>
            onPhoneChange(e.target.value)
          }
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Delivery Address
        </label>
        <textarea
          value={address}
          onChange={(e) =>
            onAddressChange(e.target.value)
          }
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </section>
  )
}
