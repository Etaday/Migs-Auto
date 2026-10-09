import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listVehicles } from '@/lib/db'
import type { Vehicle } from '@/types/vehicle'
import DatePicker from '@/components/DatePicker'
import InquiryForm from './InquiryForm'

const TIMES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)

export default function TestDriveView() {
  const [params] = useSearchParams()
  const [list, setList] = useState<Vehicle[]>([])
  const [vehicleId, setVehicleId] = useState(params.get('vehicle') ?? '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState(TIMES[0])
  useEffect(() => { listVehicles().then(setList).catch(() => setList([])) }, [])
  return (
    <section className="mpage">
      <h1 className="mpage__title">Book a test drive</h1>
      <InquiryForm kind="test_drive" vehicleId={vehicleId || undefined} details={{ date, time }} submitLabel="Book test drive">
        <label>Vehicle
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">Not sure yet</option>
            {list.map((v) => <option key={v.id} value={v.id}>{v.year} {v.brand} {v.model}</option>)}
          </select>
        </label>
        <label>Date<DatePicker name="date" value={date} onChange={setDate} min={today()} /></label>
        <label>Time<select value={time} onChange={(e) => setTime(e.target.value)}>{TIMES.map((t) => <option key={t}>{t}</option>)}</select></label>
      </InquiryForm>
    </section>
  )
}
