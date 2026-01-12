import { useState } from 'react'
import { Onboarding } from './components/Onboarding'
import { ArtistList } from './components/ArtistList'
import { ArtistDetail } from './components/ArtistDetail'
import type { Artist } from './firebase/types'

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />
  }

  if (selectedArtist) {
    return (
      <ArtistDetail
        artist={selectedArtist}
        onClose={() => setSelectedArtist(null)}
      />
    )
  }

  return <ArtistList onViewArtist={setSelectedArtist} />
}

export default App
