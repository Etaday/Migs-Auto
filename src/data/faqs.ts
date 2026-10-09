export type QA = { q: string; a: string }

/**
 * The questions people ask before they email. One list, used by the FAQ
 * accordion on the Contact view (and the legacy long-scroll FAQ section).
 * Five questions, two or three sentences each: the accordion sits in a
 * fixed panel and more than that pushes the email row off the plate.
 */
export const FAQS: QA[] = [
  {
    q: 'What do you do?',
    a: 'We offer glass and 360 photo booths, cake mapping, studio shots, photo and video coverage, and food photography. Our clients are event hosts, businesses and restaurants.',
  },
  {
    q: 'How fast can you start?',
    a: 'Tell us your date as early as you can. Popular weekends fill up, and we will confirm availability when you write.',
  },
  {
    q: 'How much do you charge?',
    a: 'Prices are listed on the Services page in KWD. A location charge of 0, 20, 30 or 50 KWD is added by area. A 30% deposit confirms your booking and the remaining 70% is paid at the venue on the event date. Coverage and food photography are quoted personally.',
  },
  {
    q: 'Do you travel for shoots?',
    a: 'Yes. Booths and coverage happen at your venue. Travel is added to the quote when the event is outside our home area.',
  },
  {
    q: 'What happens after I write?',
    a: 'We reply within one business day. The next step is a quick chat about your event, then a proposal with what is included and the price.',
  },
]
