import { useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { caretAfterFormat, formatMoneyInput, parseMoneyInput } from '@/lib/money'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** The amount as text (commas are fine). */
  value: string
  /** Called with the amount as typed, already formatted with commas. */
  onChange: (value: string) => void
}

/** A text box for pesos that shows thousands separators as you type (250000 becomes 250,000). */
export default function MoneyInput({ value, onChange, ...rest }: Props) {
  const [text, setText] = useState(() => formatMoneyInput(value))
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)

  // Follow the parent when it changes the amount itself (a vehicle was picked, a form was reset).
  useEffect(() => {
    setText((t) => (parseMoneyInput(value) === parseMoneyInput(t) ? t : formatMoneyInput(value)))
  }, [value])

  // Put the cursor back next to the digit it was next to before the commas moved.
  useLayoutEffect(() => {
    if (caret.current != null && ref.current) { ref.current.setSelectionRange(caret.current, caret.current); caret.current = null }
  })

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const raw = e.target.value
        const next = formatMoneyInput(raw)
        caret.current = caretAfterFormat(raw, e.target.selectionStart ?? raw.length, next)
        setText(next)
        onChange(next)
      }}
    />
  )
}
