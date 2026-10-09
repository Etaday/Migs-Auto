import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { UserPlus, Trash } from '@/components/slab'
import { addTeamMember, backendOn, listTeam, removeTeamMember, type TeamMember } from '@/lib/db'

/** Who can sign in to the dashboard: add a person with a password, or remove access. */
export default function TeamView() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { setTeam(await listTeam()) } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load the team.' }) }
  }, [])
  useEffect(() => { void load() }, [load])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await addTeamMember(email, password)
      setMsg({ ok: true, text: `${email.trim()} can now sign in. Share the password with them privately.` })
      setEmail('')
      setPassword('')
      await load()
    } catch (x) {
      setMsg({ ok: false, text: x instanceof Error ? x.message : 'Could not add that person.' })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (m: TeamMember) => {
    if (!window.confirm(`Remove ${m.email}? They will no longer be able to open the dashboard.`)) return
    try { await removeTeamMember(m.email); await load() } catch (x) { setMsg({ ok: false, text: x instanceof Error ? x.message : 'Could not remove.' }) }
  }

  return (
    <div className="adm-stack">
      <section className="adm-panel">
        <h2>Add a user</h2>
        <form onSubmit={add} noValidate className="adm-row">
          <label className="adm-field"><span>Email</span><input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="adm-field"><span>Password (8 or more characters)</span><input type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button type="submit" className="adm-btn" disabled={busy || !email || password.length < 8}><UserPlus size={15} aria-hidden="true" /> {busy ? 'Adding' : 'Add user'}</button>
        </form>
        {msg && <p className={msg.ok ? 'adm-note' : 'adm-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
        <p className="adm-note">{backendOn ? 'Added users get the same access as you. If email confirmation is on in Supabase, they confirm from an email first.' : 'No database is connected, so these accounts exist in this browser only.'}</p>
      </section>
      <section className="adm-panel">
        <h2>People with access</h2>
        {team.length === 0 ? <p className="adm-empty">Nobody yet.</p> : (
          <ul className="adm-list">
            {team.map((m) => (
              <li key={m.email}>
                <span className="adm-list__main"><b>{m.email}</b>{m.you && <small>You</small>}</span>
                {!m.you && <button type="button" className="adm-icon-btn" aria-label={`Remove ${m.email}`} onClick={() => void remove(m)}><Trash size={16} /></button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
