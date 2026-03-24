'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Upload,
  X,
  Loader2,
  Smartphone,
  Battery,
  Monitor,
  Square,
  Camera,
  Fingerprint,
  Layers,
  ImagePlus,
  Tag,
  CreditCard,
} from 'lucide-react'
import { supabase, getSessionHeaders } from '@/lib/supabaseClient'
import { getUpgradeSuggestions } from '@/lib/swap-suggestions'
import type {
  SwapPhoneModel,
  SwapInventoryItem,
  SwapUpgradeSuggestion,
  DeductionBreakdownItem,
  SwapConditionScore,
} from '@/types/swap'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormData = {
  brand: string
  model_id: string
  storage: string
  color: string

  battery_health: number
  battery_replaced: boolean

  screen_condition: 'perfect' | 'minor_scratches' | 'cracked' | ''
  screen_replaced: boolean

  back_glass_condition: 'perfect' | 'minor_scratches' | 'cracked' | ''
  back_glass_replaced: boolean

  camera_glass_cracked: boolean
  front_camera_working: boolean
  rear_cameras_status: Record<string, boolean>

  face_id_working: boolean
  fingerprint_working: boolean

  body_condition: 'perfect' | 'minor_scratches' | 'cracked' | ''
  other_issues: string
  water_damage: boolean

  photo_front: string
  photo_back: string
  photo_left: string
  photo_right: string
  photo_cameras: string
  photo_back_glass: string
  battery_health_screenshot: string

  calculated_trade_in_value: number
  deduction_breakdown: DeductionBreakdownItem[]
  condition_score: SwapConditionScore | ''
  desired_inventory_id: string
}

const INITIAL_FORM: FormData = {
  brand: '',
  model_id: '',
  storage: '',
  color: '',
  battery_health: 100,
  battery_replaced: false,
  screen_condition: '',
  screen_replaced: false,
  back_glass_condition: '',
  back_glass_replaced: false,
  camera_glass_cracked: false,
  front_camera_working: true,
  rear_cameras_status: {},
  face_id_working: true,
  fingerprint_working: true,
  body_condition: '',
  other_issues: '',
  water_damage: false,
  photo_front: '',
  photo_back: '',
  photo_left: '',
  photo_right: '',
  photo_cameras: '',
  photo_back_glass: '',
  battery_health_screenshot: '',
  calculated_trade_in_value: 0,
  deduction_breakdown: [],
  condition_score: '',
  desired_inventory_id: '',
}

const STEP_LABELS = [
  'Your Phone',
  'Battery',
  'Screen',
  'Back Glass',
  'Cameras',
  'Biometrics',
  'Body & Other',
  'Photos',
  'Your Offer',
  'Pay Deposit',
]

const STEP_ICONS = [
  Smartphone,
  Battery,
  Monitor,
  Square,
  Camera,
  Fingerprint,
  Layers,
  ImagePlus,
  Tag,
  CreditCard,
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function uploadPhoto(file: File, label: string, token: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('label', label)
  const res = await fetch('/api/upload/swap-photo', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Upload failed')
  }
  const data = await res.json()
  return data.url as string
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step - 1) / (total - 1)) * 100)
  return (
    <div className="mb-8">
      {/* Fill bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Step label */}
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-orange-500">
            Step {step} of {total}
          </span>
          <h3 className="text-lg font-bold text-gray-900 leading-tight">{STEP_LABELS[step - 1]}</h3>
        </div>
        <span className="text-sm font-medium text-gray-400">{pct}%</span>
      </div>

      {/* Numbered dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1
          const done = n < step
          const current = n === step
          return (
            <div
              key={n}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                done ? 'bg-orange-400' : current ? 'bg-orange-500' : 'bg-gray-200'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}

function YesNoToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-semibold">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-4 py-2 transition-colors ${value ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-4 py-2 transition-colors border-l border-gray-200 ${!value ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          No
        </button>
      </div>
    </div>
  )
}

type ConditionOption = {
  value: 'perfect' | 'minor_scratches' | 'cracked'
  label: string
  description: string
  icon: string
}

const CONDITION_OPTIONS: ConditionOption[] = [
  { value: 'perfect', label: 'Perfect', description: 'No visible damage', icon: '✨' },
  { value: 'minor_scratches', label: 'Minor Scratches', description: 'Light wear, no cracks', icon: '🔍' },
  { value: 'cracked', label: 'Cracked', description: 'Has cracks or chips', icon: '💔' },
]

function ConditionSelector({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: 'perfect' | 'minor_scratches' | 'cracked') => void
  label: string
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-3">{label}</p>
      <div className="grid grid-cols-3 gap-3">
        {CONDITION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-2xl border-2 p-3 text-center transition-all
              ${value === opt.value
                ? 'border-orange-500 bg-orange-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
          >
            <div className="text-2xl mb-1">{opt.icon}</div>
            <div className="text-xs font-bold text-gray-800">{opt.label}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{opt.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function PhotoUploadField({
  label,
  fieldKey,
  value,
  onUpload,
  uploading,
}: {
  label: string
  fieldKey: string
  value: string
  onUpload: (file: File, key: string) => Promise<void>
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {value ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="opacity-0 hover:opacity-100 bg-white rounded-full p-2 shadow-md"
            >
              <Upload size={14} />
            </button>
          </div>
          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
            <Check size={10} className="text-white" />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-orange-50 hover:border-orange-300 transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 size={20} className="text-orange-500 animate-spin" />
          ) : (
            <Upload size={20} className="text-gray-400" />
          )}
          <span className="text-xs text-gray-500">{uploading ? 'Uploading...' : 'Tap to upload'}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file, fieldKey)
          e.target.value = ''
        }}
      />
    </div>
  )
}

const CONDITION_SCORE_CONFIG: Record<
  SwapConditionScore,
  { label: string; color: string; bg: string; border: string }
> = {
  mint: { label: 'Mint', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  good: { label: 'Good', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  fair: { label: 'Fair', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  poor: { label: 'Poor', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SwapSubmitPage() {
  const router = useRouter()

  const [authLoading, setAuthLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [stepError, setStepError] = useState<string | null>(null)

  // Step 1 data
  const [brands, setBrands] = useState<string[]>([])
  const [models, setModels] = useState<SwapPhoneModel[]>([])
  const [selectedModel, setSelectedModel] = useState<SwapPhoneModel | null>(null)
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)

  // Step 8 upload state
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({})

  // Step 9 state
  const [valuationLoading, setValuationLoading] = useState(false)
  const [valuationError, setValuationError] = useState<string | null>(null)
  const [inventory, setInventory] = useState<SwapInventoryItem[]>([])
  const [suggestions, setSuggestions] = useState<SwapUpgradeSuggestion[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)

  // Step 10 state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace('/auth?next=/swap/submit')
        return
      }
      setToken(session.access_token)
      setUserEmail(session.user.email ?? '')
      setAuthLoading(false)
    }
    checkAuth()
  }, [router])

  // ---------------------------------------------------------------------------
  // Step 1: Load brands on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const fetchBrands = async () => {
      setBrandsLoading(true)
      try {
        const res = await fetch('/api/swap/models')
        const data = await res.json()
        setBrands(data.brands ?? [])
      } catch {
        // ignore
      } finally {
        setBrandsLoading(false)
      }
    }
    fetchBrands()
  }, [])

  // Load models when brand changes
  useEffect(() => {
    if (!formData.brand) {
      setModels([])
      setSelectedModel(null)
      return
    }
    const fetchModels = async () => {
      setModelsLoading(true)
      try {
        const res = await fetch(`/api/swap/models?brand=${encodeURIComponent(formData.brand)}`)
        const data = await res.json()
        setModels(data.models ?? [])
      } catch {
        // ignore
      } finally {
        setModelsLoading(false)
      }
    }
    fetchModels()
  }, [formData.brand])

  // ---------------------------------------------------------------------------
  // Auto-advance steps with no content
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (step === 4 && selectedModel && !selectedModel.has_back_glass) {
      setStep(5)
    }
    if (step === 6 && selectedModel && selectedModel.biometric === 'none') {
      setStep(7)
    }
  }, [step, selectedModel])

  // ---------------------------------------------------------------------------
  // Step 9: Fetch valuation when entering
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (step !== 9) return

    const fetchValuation = async () => {
      setValuationLoading(true)
      setValuationError(null)
      try {
        const photos = [
          formData.photo_front,
          formData.photo_back,
          formData.photo_left,
          formData.photo_right,
          formData.photo_cameras,
          formData.battery_health_screenshot,
          ...(selectedModel?.has_back_glass && formData.photo_back_glass ? [formData.photo_back_glass] : []),
        ].filter(Boolean)

        const body = {
          model_id: formData.model_id,
          storage: formData.storage,
          color: formData.color,
          battery_health: formData.battery_health,
          battery_replaced: formData.battery_replaced,
          screen_condition: formData.screen_condition || 'perfect',
          screen_replaced: formData.screen_replaced,
          back_glass_condition: formData.back_glass_condition || null,
          back_glass_replaced: formData.back_glass_replaced,
          camera_glass_cracked: formData.camera_glass_cracked,
          front_camera_working: formData.front_camera_working,
          rear_cameras_status: formData.rear_cameras_status,
          face_id_working: formData.face_id_working,
          fingerprint_working: formData.fingerprint_working,
          body_condition: formData.body_condition || 'perfect',
          other_issues: formData.other_issues || null,
          water_damage: false,
          photos,
          battery_health_screenshot: formData.battery_health_screenshot,
        }

        const res = await fetch('/api/swap/valuation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to calculate valuation')
        }

        const data = await res.json()
        setFormData((prev) => ({
          ...prev,
          calculated_trade_in_value: data.calculated_trade_in_value,
          deduction_breakdown: data.deduction_breakdown,
          condition_score: data.condition_score,
        }))
      } catch (err) {
        setValuationError(err instanceof Error ? err.message : 'Failed to calculate valuation')
      } finally {
        setValuationLoading(false)
      }
    }

    fetchValuation()
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch inventory for step 9 suggestions
  useEffect(() => {
    if (step !== 9) return
    const fetchInventory = async () => {
      setInventoryLoading(true)
      try {
        const res = await fetch('/api/swap/inventory')
        const data = await res.json()
        setInventory(data.inventory ?? [])
      } catch {
        // ignore
      } finally {
        setInventoryLoading(false)
      }
    }
    fetchInventory()
  }, [step])

  // Compute suggestions when trade-in value or inventory changes
  useEffect(() => {
    if (formData.calculated_trade_in_value > 0 && inventory.length > 0) {
      setSuggestions(getUpgradeSuggestions(formData.calculated_trade_in_value, inventory))
    }
  }, [formData.calculated_trade_in_value, inventory])

  // ---------------------------------------------------------------------------
  // Update helpers
  // ---------------------------------------------------------------------------

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setStepError(null)
  }

  // ---------------------------------------------------------------------------
  // Photo upload
  // ---------------------------------------------------------------------------

  const handlePhotoUpload = async (file: File, fieldKey: string) => {
    if (!token) return
    setUploadingFields((prev) => ({ ...prev, [fieldKey]: true }))
    try {
      const url = await uploadPhoto(file, fieldKey, token)
      setFormData((prev) => ({ ...prev, [fieldKey]: url } as FormData))
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingFields((prev) => ({ ...prev, [fieldKey]: false }))
    }
  }

  // ---------------------------------------------------------------------------
  // Validation per step
  // ---------------------------------------------------------------------------

  const validateStep = (): string | null => {
    switch (step) {
      case 1:
        if (!formData.brand) return 'Please select a brand.'
        if (!formData.model_id) return 'Please select a model.'
        if (!formData.storage.trim()) return 'Please enter the storage capacity.'
        if (!formData.color.trim()) return 'Please enter the color.'
        return null

      case 2:
        if (formData.battery_health < 60)
          return 'Sorry, we only accept phones with battery health above 60%.'
        return null

      case 3:
        if (!formData.screen_condition) return 'Please select the screen condition.'
        return null

      case 4:
        if (selectedModel?.has_back_glass && !formData.back_glass_condition)
          return 'Please select the back glass condition.'
        return null

      case 5:
        return null

      case 6:
        return null

      case 7:
        if (!formData.body_condition) return 'Please select the body condition.'
        if (formData.water_damage) return 'We cannot accept water damaged phones.'
        return null

      case 8: {
        const required: Array<keyof FormData> = [
          'photo_front',
          'photo_back',
          'photo_left',
          'photo_right',
          'photo_cameras',
          'battery_health_screenshot',
        ]
        if (selectedModel?.has_back_glass) required.push('photo_back_glass')
        for (const key of required) {
          if (!formData[key]) {
            const labelMap: Record<string, string> = {
              photo_front: 'Front',
              photo_back: 'Back',
              photo_left: 'Left side',
              photo_right: 'Right side',
              photo_cameras: 'Rear cameras',
              battery_health_screenshot: 'Battery health screenshot',
              photo_back_glass: 'Back glass',
            }
            return `Please upload the ${labelMap[key] ?? key} photo.`
          }
        }
        return null
      }

      case 9:
        if (!formData.desired_inventory_id) return 'Please select an upgrade phone.'
        return null

      case 10:
        return null

      default:
        return null
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const handleNext = () => {
    const err = validateStep()
    if (err) {
      setStepError(err)
      return
    }
    setStepError(null)
    setStep((s) => Math.min(s + 1, 10))
  }

  const handleBack = () => {
    setStepError(null)
    let prev = step - 1
    if (prev === 6 && selectedModel?.biometric === 'none') prev = 5
    if (prev === 4 && selectedModel && !selectedModel.has_back_glass) prev = 3
    setStep(Math.max(prev, 1))
  }

  // ---------------------------------------------------------------------------
  // Step 10: Submit + Pay
  // ---------------------------------------------------------------------------

  const handlePayDeposit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const headers = await getSessionHeaders()

      const photos = [
        formData.photo_front,
        formData.photo_back,
        formData.photo_left,
        formData.photo_right,
        formData.photo_cameras,
        formData.battery_health_screenshot,
        ...(selectedModel?.has_back_glass && formData.photo_back_glass ? [formData.photo_back_glass] : []),
      ].filter(Boolean)

      // 1. Create submission
      const submitRes = await fetch('/api/swap/submit', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: formData.model_id,
          storage: formData.storage,
          color: formData.color,
          battery_health: formData.battery_health,
          battery_replaced: formData.battery_replaced,
          screen_condition: formData.screen_condition || 'perfect',
          screen_replaced: formData.screen_replaced,
          back_glass_condition: formData.back_glass_condition || null,
          back_glass_replaced: formData.back_glass_replaced,
          camera_glass_cracked: formData.camera_glass_cracked,
          front_camera_working: formData.front_camera_working,
          rear_cameras_status: formData.rear_cameras_status,
          face_id_working: formData.face_id_working,
          fingerprint_working: formData.fingerprint_working,
          body_condition: formData.body_condition || 'perfect',
          other_issues: formData.other_issues || null,
          water_damage: false,
          photos,
          battery_health_screenshot: formData.battery_health_screenshot,
          desired_inventory_id: formData.desired_inventory_id || null,
          calculated_trade_in_value: formData.calculated_trade_in_value,
          deduction_breakdown: formData.deduction_breakdown,
          condition_score: formData.condition_score,
        }),
      })

      if (!submitRes.ok) {
        const err = await submitRes.json()
        throw new Error(err.error || 'Submission failed')
      }

      const submitData = await submitRes.json()
      const submission_id: string = submitData.submission_id

      // 2. Initiate deposit
      const depositRes = await fetch('/api/swap/deposit/initiate', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id, email: userEmail }),
      })

      if (!depositRes.ok) {
        const err = await depositRes.json()
        throw new Error(err.error || 'Failed to initiate deposit')
      }

      const depositData = await depositRes.json()
      const authorization_url: string = depositData.authorization_url

      // 3. Redirect to Paystack
      window.location.href = authorization_url
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render steps
  // ---------------------------------------------------------------------------

  const renderStep = () => {
    switch (step) {
      // -----------------------------------------------------------------------
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
              <select
                value={formData.brand}
                onChange={(e) => {
                  update('brand', e.target.value)
                  update('model_id', '')
                  setSelectedModel(null)
                }}
                disabled={brandsLoading}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60"
              >
                <option value="">{brandsLoading ? 'Loading brands…' : 'Select brand'}</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
              <select
                value={formData.model_id}
                onChange={(e) => {
                  const model = models.find((m) => m.id === e.target.value) ?? null
                  update('model_id', e.target.value)
                  setSelectedModel(model)
                  if (model) {
                    const initial: Record<string, boolean> = {}
                    for (const cam of model.rear_cameras) {
                      initial[cam] = true
                    }
                    update('rear_cameras_status', initial)
                  }
                }}
                disabled={!formData.brand || modelsLoading}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60"
              >
                <option value="">
                  {!formData.brand ? 'Select a brand first' : modelsLoading ? 'Loading models…' : 'Select model'}
                </option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.model} ({m.release_year})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Storage</label>
              <input
                type="text"
                placeholder="e.g. 128GB, 256GB"
                value={formData.storage}
                onChange={(e) => update('storage', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
              <input
                type="text"
                placeholder="e.g. Space Black, Silver"
                value={formData.color}
                onChange={(e) => update('color', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {selectedModel && (
              <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 space-y-1">
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">Selected Model</p>
                <p className="text-sm font-semibold text-gray-800">{selectedModel.brand} {selectedModel.model}</p>
                <p className="text-xs text-gray-500">
                  {selectedModel.rear_cameras.length} rear camera{selectedModel.rear_cameras.length !== 1 ? 's' : ''} ·{' '}
                  {selectedModel.biometric === 'faceID' ? 'Face ID' :
                    selectedModel.biometric === 'fingerprint' ? 'Fingerprint' :
                      selectedModel.biometric === 'both' ? 'Face ID + Fingerprint' : 'No biometric'} ·{' '}
                  {selectedModel.has_back_glass ? 'Glass back' : 'Non-glass back'}
                </p>
                <p className="text-xs font-semibold text-orange-600 mt-1">
                  Base trade-in value: GHS {selectedModel.base_trade_in_value.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )

      // -----------------------------------------------------------------------
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Battery Health %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.battery_health}
                onChange={(e) => update('battery_health', Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    formData.battery_health >= 80
                      ? 'bg-green-500'
                      : formData.battery_health >= 60
                        ? 'bg-yellow-400'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, formData.battery_health))}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.battery_health}% — {
                  formData.battery_health >= 80 ? 'Excellent' :
                    formData.battery_health >= 60 ? 'Acceptable' : 'Too low'
                }
              </p>
              {formData.battery_health < 60 && formData.battery_health > 0 && (
                <ErrorBox message="Sorry, we only accept phones with battery health above 60%." />
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 divide-y divide-gray-50">
              <YesNoToggle
                label="Has the battery ever been replaced?"
                value={formData.battery_replaced}
                onChange={(v) => update('battery_replaced', v)}
              />
            </div>
          </div>
        )

      // -----------------------------------------------------------------------
      case 3:
        return (
          <div className="space-y-6">
            <ConditionSelector
              label="Screen Condition"
              value={formData.screen_condition}
              onChange={(v) => update('screen_condition', v)}
            />
            <div className="rounded-2xl border border-gray-100 bg-white p-4 divide-y divide-gray-50">
              <YesNoToggle
                label="Has the screen ever been replaced?"
                value={formData.screen_replaced}
                onChange={(v) => update('screen_replaced', v)}
              />
            </div>
          </div>
        )

      // -----------------------------------------------------------------------
      case 4:
        if (!selectedModel?.has_back_glass) return null
        return (
          <div className="space-y-6">
            <ConditionSelector
              label="Back Glass Condition"
              value={formData.back_glass_condition}
              onChange={(v) => update('back_glass_condition', v)}
            />
            <div className="rounded-2xl border border-gray-100 bg-white p-4 divide-y divide-gray-50">
              <YesNoToggle
                label="Has the back glass ever been replaced?"
                value={formData.back_glass_replaced}
                onChange={(v) => update('back_glass_replaced', v)}
              />
            </div>
          </div>
        )

      // -----------------------------------------------------------------------
      case 5:
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 divide-y divide-gray-50">
              <YesNoToggle
                label="Is the camera glass cracked?"
                value={formData.camera_glass_cracked}
                onChange={(v) => update('camera_glass_cracked', v)}
              />
              <YesNoToggle
                label="Is the front camera working?"
                value={formData.front_camera_working}
                onChange={(v) => update('front_camera_working', v)}
              />
              {selectedModel?.rear_cameras.map((cam) => (
                <YesNoToggle
                  key={cam}
                  label={`Is the ${cam} camera working?`}
                  value={formData.rear_cameras_status[cam] ?? true}
                  onChange={(v) =>
                    update('rear_cameras_status', { ...formData.rear_cameras_status, [cam]: v })
                  }
                />
              ))}
            </div>
          </div>
        )

      // -----------------------------------------------------------------------
      case 6:
        if (selectedModel?.biometric === 'none') return null
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 divide-y divide-gray-50">
              {(selectedModel?.biometric === 'faceID' || selectedModel?.biometric === 'both') && (
                <YesNoToggle
                  label="Is Face ID working?"
                  value={formData.face_id_working}
                  onChange={(v) => update('face_id_working', v)}
                />
              )}
              {(selectedModel?.biometric === 'fingerprint' || selectedModel?.biometric === 'both') && (
                <YesNoToggle
                  label="Is the fingerprint sensor working?"
                  value={formData.fingerprint_working}
                  onChange={(v) => update('fingerprint_working', v)}
                />
              )}
            </div>
          </div>
        )

      // -----------------------------------------------------------------------
      case 7:
        return (
          <div className="space-y-6">
            <ConditionSelector
              label="Body Condition"
              value={formData.body_condition}
              onChange={(v) => update('body_condition', v)}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Any other issues to mention? <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. loose charging port, speaker crackling…"
                value={formData.other_issues}
                onChange={(e) => update('other_issues', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 divide-y divide-gray-50">
              <YesNoToggle
                label="Water damage?"
                value={formData.water_damage}
                onChange={(v) => update('water_damage', v)}
              />
            </div>

            {formData.water_damage && (
              <ErrorBox message="We cannot accept water damaged phones." />
            )}
          </div>
        )

      // -----------------------------------------------------------------------
      case 8: {
        const photoFields: Array<{ key: keyof FormData; label: string; show: boolean }> = [
          { key: 'photo_front', label: 'Front of phone', show: true },
          { key: 'photo_back', label: 'Back of phone', show: true },
          { key: 'photo_left', label: 'Left side', show: true },
          { key: 'photo_right', label: 'Right side', show: true },
          { key: 'photo_cameras', label: 'Rear cameras close-up', show: true },
          { key: 'photo_back_glass', label: 'Back glass close-up', show: !!selectedModel?.has_back_glass },
          { key: 'battery_health_screenshot', label: 'Battery health screenshot', show: true },
        ]

        const anyUploading = Object.values(uploadingFields).some(Boolean)

        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Take clear, well-lit photos of your device. All photos are required.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {photoFields
                .filter((f) => f.show)
                .map((f) => (
                  <PhotoUploadField
                    key={f.key}
                    label={f.label}
                    fieldKey={f.key}
                    value={formData[f.key] as string}
                    onUpload={handlePhotoUpload}
                    uploading={!!uploadingFields[f.key]}
                  />
                ))}
            </div>
            {anyUploading && (
              <div className="flex items-center gap-2 text-xs text-orange-600">
                <Loader2 size={12} className="animate-spin" />
                Uploading photos…
              </div>
            )}
          </div>
        )
      }

      // -----------------------------------------------------------------------
      case 9: {
        const scoreConfig = formData.condition_score
          ? CONDITION_SCORE_CONFIG[formData.condition_score as SwapConditionScore]
          : null

        const selectedInventoryItem = inventory.find((i) => i.id === formData.desired_inventory_id)
        const deposit = 100
        const remaining = selectedInventoryItem
          ? Math.max(0, selectedInventoryItem.price - formData.calculated_trade_in_value - deposit)
          : null

        return (
          <div className="space-y-6">
            {valuationLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-orange-500">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-sm font-medium">Calculating your trade-in value…</p>
              </div>
            )}

            {valuationError && <ErrorBox message={valuationError} />}

            {!valuationLoading && !valuationError && (
              <>
                {/* Trade-in value card */}
                <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-md">
                  <p className="text-sm font-medium opacity-90">Your trade-in value</p>
                  <p className="text-4xl font-bold mt-1">GHS {formData.calculated_trade_in_value.toLocaleString()}</p>
                  {scoreConfig && (
                    <span className={`mt-3 inline-block text-xs font-bold px-3 py-1 rounded-full ${scoreConfig.bg} ${scoreConfig.color} ${scoreConfig.border} border`}>
                      {scoreConfig.label} Condition
                    </span>
                  )}
                </div>

                {/* Deductions */}
                {formData.deduction_breakdown.length > 0 && (
                  <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-sm font-semibold text-gray-700">Deduction Breakdown</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {formData.deduction_breakdown.map((item, i) => (
                        <div key={i} className="flex items-start justify-between px-4 py-3 gap-4">
                          <span className="text-xs text-gray-600 flex-1">{item.reason}</span>
                          <span className="text-xs font-semibold text-red-600 shrink-0">
                            − GHS {item.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upgrade suggestions */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Choose your upgrade phone</p>
                  {inventoryLoading && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
                      <Loader2 size={14} className="animate-spin" />
                      Loading available phones…
                    </div>
                  )}
                  {!inventoryLoading && suggestions.length === 0 && (
                    <p className="text-sm text-gray-500">No upgrade options available right now.</p>
                  )}
                  {!inventoryLoading && suggestions.length > 0 && (
                    <div className="space-y-3">
                      {suggestions.map((s) => {
                        const model = s.item.swap_phone_models
                        const isSelected = formData.desired_inventory_id === s.item.id
                        return (
                          <button
                            key={s.item.id}
                            type="button"
                            onClick={() => update('desired_inventory_id', s.item.id)}
                            className={`w-full rounded-2xl border-2 p-4 text-left transition-all
                              ${isSelected
                                ? 'border-orange-500 bg-orange-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                                    ${s.label === 'Budget Upgrade' ? 'bg-blue-100 text-blue-700' :
                                      s.label === 'Best Upgrade' ? 'bg-purple-100 text-purple-700' :
                                        'bg-green-100 text-green-700'}`}>
                                    {s.label}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {model?.brand} {model?.model} — {s.item.storage} {s.item.color}
                                </p>
                                <p className="text-xs text-gray-500 capitalize mt-0.5">
                                  {s.item.condition.replace('_', ' ')}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-gray-900">GHS {s.item.price.toLocaleString()}</p>
                                <p className="text-xs text-orange-600 font-semibold">
                                  Top up: GHS {s.topUpAmount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-2 flex justify-end">
                                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                                  <Check size={11} className="text-white" />
                                </div>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Summary */}
                {selectedInventoryItem && (
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-700">Order Summary</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      <div className="flex justify-between px-4 py-3 text-sm">
                        <span className="text-gray-600">Your phone value</span>
                        <span className="font-semibold text-green-600">+ GHS {formData.calculated_trade_in_value.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between px-4 py-3 text-sm">
                        <span className="text-gray-600">
                          {selectedInventoryItem.swap_phone_models?.brand}{' '}
                          {selectedInventoryItem.swap_phone_models?.model} price
                        </span>
                        <span className="font-semibold text-gray-800">GHS {selectedInventoryItem.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between px-4 py-3 text-sm">
                        <span className="text-gray-600">Deposit (due now)</span>
                        <span className="font-semibold text-orange-600">GHS {deposit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between px-4 py-3 text-sm font-bold">
                        <span className="text-gray-800">Remaining balance</span>
                        <span className="text-gray-900">GHS {remaining?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      }

      // -----------------------------------------------------------------------
      case 10: {
        const selectedInventoryItem = inventory.find((i) => i.id === formData.desired_inventory_id)
        const deposit = 100
        const remaining = selectedInventoryItem
          ? Math.max(0, selectedInventoryItem.price - formData.calculated_trade_in_value - deposit)
          : null

        return (
          <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 shadow-md space-y-4">
              <p className="text-sm font-semibold opacity-80">Swap Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-70">Your phone</span>
                  <span className="font-semibold">
                    {selectedModel?.brand} {selectedModel?.model} · {formData.storage} · {formData.color}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Trade-in value</span>
                  <span className="font-semibold text-green-400">GHS {formData.calculated_trade_in_value.toLocaleString()}</span>
                </div>
                {selectedInventoryItem && (
                  <div className="flex justify-between">
                    <span className="opacity-70">Upgrade phone</span>
                    <span className="font-semibold">
                      {selectedInventoryItem.swap_phone_models?.brand}{' '}
                      {selectedInventoryItem.swap_phone_models?.model} · {selectedInventoryItem.storage}
                    </span>
                  </div>
                )}
                <div className="border-t border-white/20 pt-2 flex justify-between text-base font-bold">
                  <span>Remaining balance</span>
                  <span>GHS {remaining?.toLocaleString() ?? '—'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-orange-800">Deposit: GHS 100</p>
              <p className="text-xs text-orange-700">
                A refundable deposit secures your spot. It will be applied towards the remaining balance when you come in for your appointment.
              </p>
            </div>

            {submitError && <ErrorBox message={submitError} />}

            <button
              type="button"
              onClick={handlePayDeposit}
              disabled={submitting}
              className="w-full rounded-2xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-4 text-base transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  Pay GHS 100 Deposit
                </>
              )}
            </button>

            <p className="text-xs text-center text-gray-400">
              Secured by Paystack. You will be redirected to complete payment.
            </p>
          </div>
        )
      }

      default:
        return null
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / Auth gate
  // ---------------------------------------------------------------------------

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-orange-500" />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const isFirstStep = step === 1
  const isLastStep = step === 10

  const nextBlocked =
    (step === 2 && formData.battery_health < 60) ||
    (step === 7 && formData.water_damage) ||
    (step === 9 && valuationLoading)

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Phone Swap</h1>
          <p className="text-sm text-gray-500 mt-1">Trade in your phone and upgrade to a new one.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <ProgressBar step={step} total={10} />

          {/* Step title */}
          <h2 className="text-lg font-bold text-gray-900 mb-5">
            {STEP_LABELS[step - 1]}
          </h2>

          {/* Step content */}
          {renderStep()}

          {/* Step error */}
          {stepError && (
            <div className="mt-4">
              <ErrorBox message={stepError} />
            </div>
          )}

          {/* Navigation */}
          {step !== 10 && (
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-50">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={nextBlocked}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isLastStep ? 'Finish' : 'Next'}
                {!isLastStep && <ChevronRight size={16} />}
              </button>
            </div>
          )}

          {step === 10 && !isFirstStep && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-1 px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            </div>
          )}
        </div>

        {/* Step counter */}
        <p className="text-center text-xs text-gray-400 mt-4">
          {step} / {10} steps completed
        </p>
      </div>
    </main>
  )
}
