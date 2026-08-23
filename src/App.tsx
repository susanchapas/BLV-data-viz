import { Routes, Route } from 'react-router-dom'
import { FilterProvider } from '@/lib/filters'
import { MotionProvider } from '@/lib/motion'
import { AnnounceProvider } from '@/lib/announce'
import { Nav } from '@/components/Nav'
import { FilterBar } from '@/components/FilterBar'
import { EvidenceExplorer } from '@/views/EvidenceExplorer'
import { VerificationAsymmetry } from '@/views/VerificationAsymmetry'
import { SignalLedger } from '@/views/SignalLedger'
import { ThemeBrowser } from '@/views/ThemeBrowser'
import { ParticipantProfiles } from '@/views/ParticipantProfiles'
import { ChartGallery } from '@/views/ChartGallery'

export default function App() {
  return (
    <MotionProvider>
      <AnnounceProvider>
        <FilterProvider>
          <div className="min-h-screen bg-white text-grey-5 font-sans">
            <Nav />
            <FilterBar />
            <main id="main" className="max-w-screen-2xl mx-auto px-4 py-6" tabIndex={-1}>
              <Routes>
                <Route path="/" element={<EvidenceExplorer />} />
                <Route path="/verification" element={<VerificationAsymmetry />} />
                <Route path="/signals" element={<SignalLedger />} />
                <Route path="/themes" element={<ThemeBrowser />} />
                <Route path="/participants" element={<ParticipantProfiles />} />
                <Route path="/participants/:pid" element={<ParticipantProfiles />} />
                <Route path="/charts" element={<ChartGallery />} />
              </Routes>
            </main>
          </div>
        </FilterProvider>
      </AnnounceProvider>
    </MotionProvider>
  )
}
