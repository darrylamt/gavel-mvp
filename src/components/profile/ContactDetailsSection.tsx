type Props = {
  phone: string
  address: string
}

export default function ContactDetailsSection({
  phone,
  address,
}: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">
        Contact Details
      </h2>

      <div className="space-y-4 rounded-xl border bg-white p-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Phone Number</p>
          <p className="mt-1 text-base text-gray-900">{phone || 'Not provided'}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700">Delivery Address</p>
          <p className="mt-1 text-base text-gray-900">{address || 'Not provided'}</p>
        </div>
      </div>
    </section>
  )
}
