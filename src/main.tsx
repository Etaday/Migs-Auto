import ErrorBoundary from '@/components/ErrorBoundary'
import { bootKnowledge } from '@/lib/knowledgeClient'
import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Home from '@/components/Home'
import NotFound from '@/components/NotFound'
import { restorePerfTier } from '@/lib/perf'
import { restorePrefs } from '@/lib/a11y'

// Every route but Home is its own chunk: the first visit only pays for Home.
const InventoryView = lazy(() => import('@/components/inventory/InventoryView'))
const VehicleDetail = lazy(() => import('@/components/inventory/VehicleDetail'))
const AboutView = lazy(() => import('@/components/AboutView'))
const TradeInView = lazy(() => import('@/components/forms/TradeInView'))
const FinancingView = lazy(() => import('@/components/forms/FinancingView'))
const TestDriveView = lazy(() => import('@/components/forms/TestDriveView'))
const ContactView = lazy(() => import('@/components/ContactView'))
const AdminApp = lazy(() => import('@/components/admin/AdminApp'))
const SharedDocument = lazy(() => import('@/components/SharedDocument'))
const InvoiceStudio = lazy(() => import('@/components/InvoiceStudio'))
const Privacy = lazy(() => import('@/components/Privacy'))
const ToS = lazy(() => import('@/components/ToS'))
const ThankYou = lazy(() => import('@/components/ThankYou'))
import './styles/tokens.css'
import './styles/global.css'
import './styles/theme-glyph.css'
// The legacy section sheets first, then the shell. The redesign overrides them
// (the floating nav pill hiding behind the rail, the compact workflow), and
// equal-specificity rules are decided by source order.
import './styles/sections.css'
import './styles/extensions.css'
import './styles/shell.css'
import './styles/rail.css'
import './styles/home.css'
import './styles/bento.css'
import './styles/mybooking.css'
import './styles/projects-grid.css'
import './styles/work-grid.css'
import './styles/gallery.css'
import './styles/reviews.css'
import './styles/admin.css'
import './styles/services-grid.css'
import './styles/testimonials-grid.css'
import './styles/about-grid.css'
import './styles/contact-grid.css'
import './styles/booking-grid.css'
import './styles/invoice.css'
import './styles/boot.css'
import './styles/credentials.css'
import './styles/testimonials.css'
import './styles/mobile-app.css'
import './styles/a11y.css'
// Apple design pass - an overlay on everything above; perf.css still wins.
import './styles/apple.css'
// Mobile motion + component pass on top of it (phone shell only).
import './styles/mobile-pass.css'
// Last: the perf tiers only ever turn things OFF, so they must win.
import './styles/perf.css'
import './styles/glass.css'
import './styles/migs.css'

// Re-apply this tab's performance verdict before the first paint, so a
// downgraded visitor never sees the expensive layers flash back on reload.
restorePerfTier()
restorePrefs()

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')

const start = () =>
  createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        {/* The shell owns the rail, the shader and the intro; each child
            renders into its one scrolling panel. */}
        <Route element={<App />}>
          <Route path="/" element={<Home />} />
          <Route path="/inventory" element={<InventoryView />} />
          <Route path="/inventory/:id" element={<VehicleDetail />} />
          <Route path="/trade-in" element={<TradeInView />} />
          <Route path="/financing" element={<FinancingView />} />
          <Route path="/test-drive" element={<TestDriveView />} />
          <Route path="/about" element={<AboutView />} />
          <Route path="/contact" element={<ContactView />} />
        </Route>
        {/* Standalone pages: their own layout, no rail, document scroll. */}
        <Route path="/admin" element={<Suspense fallback={null}><AdminApp /></Suspense>} />
        <Route path="/d/:token" element={<Suspense fallback={null}><SharedDocument /></Suspense>} />
        <Route path="/invoice" element={<Suspense fallback={null}><InvoiceStudio /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={null}><Privacy /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={null}><ToS /></Suspense>} />
        <Route path="/thank-you" element={<Suspense fallback={null}><ThankYou /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

// Prices and areas follow the studio's Google Doc; render once they are applied (or after 0.8s).
void bootKnowledge().finally(start)
