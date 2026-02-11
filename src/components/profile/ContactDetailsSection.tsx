import { Input } from '@/components/base/input/input'

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

      <div className="space-y-4">
        <Input
          label="Phone Number"
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="+1 (555) 000-0000"
        />

        <Input
          label="Delivery Address"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Enter your address"
        />
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </section>
  )
}
