/*
 * L'image des écrans d'accès.
 *
 * L'original est un PNG de 8 Mo, 2738 × 1536, chargé dès la connexion. Il part
 * en AVIF, WebP à défaut, en trois largeurs : 37 à 213 Ko en AVIF, 60 à 294 Ko
 * en WebP. `sizes` dit au navigateur la largeur réellement affichée, et il
 * prend la plus petite déclinaison qui suffit, densité d'écran comprise.
 *
 * Fichiers dans `public/images/`, produits depuis `stade1.png` : AVIF qualité
 * 55, WebP qualité 78, redimensionnement Lanczos.
 */
const LARGEURS = [800, 1400, 2738]

const srcset = (format: "avif" | "webp") =>
    LARGEURS.map(w => `/images/stade1-${w}.${format} ${w}w`).join(", ")

export function ImageStade({ sizes, className }: { sizes: string; className?: string }) {
    return (
        <picture>
            <source type="image/avif" srcSet={srcset("avif")} sizes={sizes} />
            <source type="image/webp" srcSet={srcset("webp")} sizes={sizes} />
            <img src="/images/stade1-1400.webp" alt="" decoding="async" className={className} />
        </picture>
    )
}
