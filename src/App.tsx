import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { FilterProvider } from '@/lib/filters'
import { SelectionProvider } from '@/lib/selection'
import { MotionProvider } from '@/lib/motion'
import { AnnounceProvider } from '@/lib/announce'
import { Nav } from '@/components/Nav'
import { FilterBar } from '@/components/FilterBar'

import { Dashboard } from '@/views/Dashboard'

const EvidenceExplorer = lazy(() => import('@/views/EvidenceExplorer').then(m => ({ default: m.EvidenceExplorer })))
const VerificationAsymmetry = lazy(() => import('@/views/VerificationAsymmetry').then(m => ({ default: m.VerificationAsymmetry })))
const SignalLedger = lazy(() => import('@/views/SignalLedger').then(m => ({ default: m.SignalLedger })))
const ThemeBrowser = lazy(() => import('@/views/ThemeBrowser').then(m => ({ default: m.ThemeBrowser })))
const ParticipantProfiles = lazy(() => import('@/views/ParticipantProfiles').then(m => ({ default: m.ParticipantProfiles })))
const ChartGallery = lazy(() => import('@/views/ChartGallery').then(m => ({ default: m.ChartGallery })))
const DataExplorer = lazy(() => import('@/views/DataExplorer').then(m => ({ default: m.DataExplorer })))
const NeuralMap = lazy(() => import('@/views/NeuralMap').then(m => ({ default: m.NeuralMap })))

function Subpage({ children, filters = false }: { children: React.ReactNode; filters?: boolean }) {
  return (
    <div className="min-h-screen bg-surface text-text font-sans">
      <Nav />
      {filters && <FilterBar />}
      <main
        id="main"
        className="max-w-[1240px] mx-auto"
        style={{ padding: 'clamp(24px, 4vw, 48px) clamp(20px, 4vw, 48px)' }}
        tabIndex={-1}
      >
        <Suspense fallback={<div className="py-12 text-center text-text-muted">Loading…</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <MotionProvider>
      <AnnounceProvider>
        <FilterProvider>
          <SelectionProvider>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/generator" element={<Subpage><DataExplorer /></Subpage>} />
              <Route path="/evidence" element={<Subpage filters><EvidenceExplorer /></Subpage>} />
              <Route path="/verification" element={<Subpage filters><VerificationAsymmetry /></Subpage>} />
              <Route path="/signals" element={<Subpage filters><SignalLedger /></Subpage>} />
              <Route path="/themes" element={<Subpage filters><ThemeBrowser /></Subpage>} />
              <Route path="/participants" element={<Subpage filters><ParticipantProfiles /></Subpage>} />
              <Route path="/participants/:pid" element={<Subpage filters><ParticipantProfiles /></Subpage>} />
              <Route path="/charts" element={<Subpage><ChartGallery /></Subpage>} />
              <Route path="/neural-map" element={<Subpage><NeuralMap /></Subpage>} />
            </Routes>
          </SelectionProvider>
        </FilterProvider>
      </AnnounceProvider>
    </MotionProvider>
  )
}
