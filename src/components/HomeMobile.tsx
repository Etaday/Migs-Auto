import { SealCheck } from '@/components/slab'
import ThemedImg from '@/components/ThemedImg'
import { profile } from '@/data/profile'
import QuickMenu from './QuickMenu'

/**
 * Home on a phone: the profile header that stands in for the sidebar rail
 * (avatar, name, verified mark, handle and the QuickMenu with theme + accessibility).
 */

export function HomeProfile() {
  return (
    <header className="hprofile">
      <ThemedImg className="hprofile__avatar" light={profile.avatarSrc} dark="/avatar-dark.png" width={56} height={56} />
      <div className="hprofile__who">
        <span className="hprofile__name">
          {profile.name}
          <SealCheck size={16} weight="fill" className="hprofile__verified" aria-label={profile.verifiedLabel} />
        </span>
        <span className="hprofile__handle">
          {profile.handle} · {profile.role}
        </span>
      </div>
      <QuickMenu className="hprofile__menu" />
    </header>
  )
}
