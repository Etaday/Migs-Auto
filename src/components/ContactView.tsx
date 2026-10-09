import { Phone, WhatsappLogo, EnvelopeSimple, MapPin, Clock } from '@/components/slab'
import { profile } from '@/data/profile'
import InquiryForm from '@/components/forms/InquiryForm'

export default function ContactView() {
  return (
    <section className="mpage">
      <h1 className="mpage__title">Contact</h1>
      <ul className="mcontact" role="list">
        <li><a className="mbtn" href={`tel:${profile.phoneTel}`}><Phone size={18} aria-hidden="true" />&nbsp;Call {profile.phone}</a></li>
        <li><a className="mbtn" href={`https://wa.me/${profile.whatsapp}`} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={18} aria-hidden="true" />&nbsp;WhatsApp</a></li>
        <li><a className="mbtn" href={`mailto:${profile.email}`}><EnvelopeSimple size={18} aria-hidden="true" />&nbsp;Email</a></li>
      </ul>
      <p className="mpage__note"><MapPin size={16} aria-hidden="true" /> {profile.location} &nbsp; <Clock size={16} aria-hidden="true" /> {profile.hours}</p>
      <InquiryForm kind="inquiry" heading="Send us a message" messageRequired />
    </section>
  )
}
