import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { backendOn, createFirstAccount, hasLocalAccounts, signIn, signInLocal } from '@/lib/db'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState('')
  const first = !backendOn && !hasLocalAccounts()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      if (backendOn) await signIn(email.trim(), password)
      else if (first) {
        if (password !== confirm) throw new Error('The two passwords do not match.')
        await createFirstAccount(email, password)
      } else await signInLocal(email, password)
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="adm-login">
      <div className="adm-login__card">
        <img src="/logo.png" alt="Migs Auto" width={140} />
        <h1>Dealer dashboard</h1>
        <form onSubmit={submit} noValidate>
          {first && <p className="adm-note">Create the owner account for this dashboard. You can add more people later from the Team tab.</p>}
          <label className="adm-field"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="adm-field"><span>Password</span><input type="password" autoComplete={first ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {first && <label className="adm-field"><span>Repeat password</span><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>}
          {err && <p className="adm-error" role="alert">{err}</p>}
          <button type="submit" className="adm-btn" disabled={busy || !email || !password || (first && !confirm)}>{busy ? 'Please wait' : first ? 'Create account' : 'Sign in'}</button>
          {!backendOn && <p className="adm-note">No database is connected, so accounts and data stay in this browser only. Connect Supabase (see the README) for sign-in that works across devices.</p>}
        </form>
        <Link to="/" className="adm-link">Back to website</Link>
      </div>
    </main>
  )
}
