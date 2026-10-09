import { profile } from '@/data/profile'

export default function AboutView() {
  return (
    <section className="mpage">
      <h1 className="mpage__title">About Migs Auto</h1>
      <img src="/logo-wide.png" alt="Migs Auto logo" width={320} />
      <p>{profile.hero.body}</p>
      <p className="mpage__note">Every vehicle is listed with its real specifications. Ask us about a trade-in, financing, or a test drive.</p>
    </section>
  )
}
