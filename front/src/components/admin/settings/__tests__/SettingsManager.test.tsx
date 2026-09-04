import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * Les deux anciens onglets, Evenements et Mon club, ne contenaient que des
 * reglages de club : les cartes le disaient elles-memes. Ils sont reunis en
 * une seule page a rubriques.
 */

const mockFetchClubConfig = vi.hoisted(() => vi.fn())
const mockFetchClubCourts = vi.hoisted(() => vi.fn())
const mockProfile = vi.hoisted(() => ({ current: { club_id: 'c-1' } as { club_id: string | null } | null }))

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ profile: mockProfile.current }),
}))

vi.mock('@/hooks/useClubConfig', () => ({
    useClubConfig: () => ({
        clubConfig: { id: 'c-1', club_name: 'Squash Lyon' },
        scoringRules: null,
        promotionRules: null,
        loading: false,
        error: null,
        defaultScoring: { score_points: [] },
        defaultPromotion: { promoted_count: 1, relegated_count: 1 },
        fetchClubConfig: mockFetchClubConfig,
        updateClubDefaults: vi.fn(),
        upsertScoringRules: vi.fn(),
        upsertPromotionRules: vi.fn(),
    }),
}))

vi.mock('@/hooks/useClubCourts', () => ({
    useClubCourts: () => ({
        courts: [],
        loading: false,
        error: null,
        fetchClubCourts: mockFetchClubCourts,
        addClubCourt: vi.fn(),
        updateClubCourt: vi.fn(),
        removeClubCourt: vi.fn(),
        initClubCourts: vi.fn(),
    }),
}))

vi.mock('../ClubLogoCard', () => ({ ClubLogoCard: () => <div>PANNEAU LOGO</div> }))
vi.mock('../ClubCourtsCard', () => ({ ClubCourtsCard: () => <div>PANNEAU TERRAINS</div> }))
vi.mock('../EventDefaultsCard', () => ({ EventDefaultsCard: () => <div>PANNEAU DEFAUTS</div> }))
vi.mock('../ScoringRulesCard', () => ({ ScoringRulesCard: () => <div>PANNEAU POINTAGE</div> }))
vi.mock('../PromotionRulesCard', () => ({ PromotionRulesCard: () => <div>PANNEAU MONTEES</div> }))

import { SettingsManager, SETTINGS_SECTIONS } from '../SettingsManager'

describe('SettingsManager', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockProfile.current = { club_id: 'c-1' }
    })

    it('liste toutes les rubriques', () => {
        render(<SettingsManager />)

        for (const section of SETTINGS_SECTIONS) {
            expect(screen.getByRole('tab', { name: new RegExp(section.label, 'i') })).toBeInTheDocument()
        }
    })

    it('ouvre la premiere rubrique par defaut', () => {
        render(<SettingsManager />)

        expect(screen.getByText('PANNEAU LOGO')).toBeInTheDocument()
        expect(screen.queryByText('PANNEAU POINTAGE')).not.toBeInTheDocument()
    })

    it('change de panneau au clic sur une rubrique', () => {
        render(<SettingsManager />)

        fireEvent.click(screen.getByRole('tab', { name: /pointage/i }))

        expect(screen.getByText('PANNEAU POINTAGE')).toBeInTheDocument()
        expect(screen.queryByText('PANNEAU LOGO')).not.toBeInTheDocument()
    })

    it('marque la rubrique ouverte comme selectionnee', () => {
        render(<SettingsManager />)

        fireEvent.click(screen.getByRole('tab', { name: /terrains/i }))

        expect(screen.getByRole('tab', { name: /terrains/i })).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByRole('tab', { name: /club/i })).toHaveAttribute('aria-selected', 'false')
    })

    it('dit que les regles sont un modele pour les prochains evenements', () => {
        // C'est l'ambiguite qui faisait croire que ces reglages agissaient sur
        // l'evenement en cours : la rubrique doit l'ecarter d'elle-meme.
        render(<SettingsManager />)

        fireEvent.click(screen.getByRole('tab', { name: /montées/i }))

        expect(screen.getByText(/nouveaux événements/i)).toBeInTheDocument()
    })

    it('signale un profil sans club plutot que d afficher des rubriques vides', () => {
        mockProfile.current = { club_id: null }

        render(<SettingsManager />)

        expect(screen.getByText(/aucun club/i)).toBeInTheDocument()
        expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    })
})
