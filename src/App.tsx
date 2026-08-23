import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { FilterProvider } from '@/lib/filters'
import { MotionProvider } from '@/lib/motion'
import { AnnounceProvider } from '@/lib/announce'
import { Nav } from '@/components/Nav'
import { FilterBar } from '@/components/FilterBar'

const EvidenceExplorer = lazy(() => import('@/views/EvidenceExplorer').then(m => ({ default: m.EvidenceExplorer })))
const VerificationAsymmetry = lazy(() => import('@/views/VerificationAsymmetry').then(m => ({ default: m.VerificationAsymmetry })))
const SignalLedger = lazy(() => import('@/views/SignalLedger').then(m => ({ default: m.SignalLedger })))
const ThemeBrowser = lazy(() => import('@/views/ThemeBrowser').then(m => ({ default: m.ThemeBrowser })))
const ParticipantProfiles = lazy(() => import('@/views/ParticipantProfiles').then(m => ({ default: m.ParticipantProfiles })))
const ChartGallery = lazy(() => import('@/views/ChartGallery').then(m => ({ default: m.ChartGallery })))
const DataExplorer = lazy(() => import('@/views/DataExplorer').then(m => ({ default: m.DataExplorer })))

export default function App() {
  return (
    <MotionProvider>
      <AnnounceProvider>
        <FilterProvider>
          <div className="min-h-screen bg-surface text-text font-sans">
            <Nav />
            <FilterBar />
            <main
              id="main"
              className="max-w-[1240px] mx-auto"
              style={{ padding: 'clamp(24px, 4vw, 48px) clamp(20px, 4vw, 48px)' }}
              tabIndex={-1}
            >
              <Suspense fallback={<div className="py-12 text-center text-text-muted">Loading…</div>}>
                <Routes>
                  <Route path="/" element={<EvidenceExplorer />} />
                  <Route path="/verification" element={<VerificationAsymmetry />} />
                  <Route path="/signals" element={<SignalLedger />} />
                  <Route path="/themes" element={<ThemeBrowser />} />
                  <Route path="/participants" element={<ParticipantProfiles />} />
                  <Route path="/participants/:pid" element={<ParticipantProfiles />} />
                  <Route path="/charts" element={<ChartGallery />} />
                  <Route path="/explore" element={<DataExplorer />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </FilterProvider>
      </AnnounceProvider>
    </MotionProvider>
  )
}
