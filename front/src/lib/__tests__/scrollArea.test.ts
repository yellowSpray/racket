import { describe, it, expect } from 'vitest'
import { BARRE_MASQUEE_TELEPHONE } from '../scrollArea'

/*
 * Sur telephone la barre de la zone defilante coutait 12 px de large : les
 * 10 de la barre, et le `pr-3` que `ScrollArea` pose sur son contenu des
 * qu'elle est visible. On defile au doigt, la barre n'y sert a rien.
 */
describe('BARRE_MASQUEE_TELEPHONE', () => {
  it('masque la barre sous 640 px seulement', () => {
    expect(BARRE_MASQUEE_TELEPHONE).toContain('max-sm:[&>[data-slot=scroll-area-scrollbar]]:hidden')
  })

  // Le retrait est pose par un `:has()` de `components/ui`, d'ou le `!`.
  it('rend au contenu le retrait reserve a la barre', () => {
    expect(BARRE_MASQUEE_TELEPHONE).toContain('max-sm:[&>[data-slot=scroll-area-viewport]>div]:!pr-0')
  })
})
