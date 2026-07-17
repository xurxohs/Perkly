import type { SVGProps } from 'react';

export type PerklyGlyphName =
    | 'home'
    | 'catalog'
    | 'map'
    | 'topka'
    | 'profile'
    | 'cart'
    | 'coupon'
    | 'search';

type Props = SVGProps<SVGSVGElement> & { name: PerklyGlyphName };

/** Filled navigation glyphs shared with the visual language of PerklyApp. */
export function PerklyGlyph({ name, ...props }: Props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            {name === 'home' && (
                <path fill="currentColor" d="M3.1 10.65 10.5 4.2a2.3 2.3 0 0 1 3 0l7.4 6.45a1.45 1.45 0 0 1-.95 2.54h-.45v6.06A1.75 1.75 0 0 1 17.75 21h-2.9a.85.85 0 0 1-.85-.85v-4.2a2 2 0 0 0-4 0v4.2a.85.85 0 0 1-.85.85h-2.9a1.75 1.75 0 0 1-1.75-1.75v-6.06h-.45a1.45 1.45 0 0 1-.95-2.54Z" />
            )}
            {name === 'catalog' && (
                <path fill="currentColor" fillRule="evenodd" d="M8.35 6.1a3.65 3.65 0 0 1 7.3 0v.75h2.05a2.2 2.2 0 0 1 2.18 1.9l1.12 8.1A3.65 3.65 0 0 1 17.38 21H6.62A3.65 3.65 0 0 1 3 16.85l1.12-8.1a2.2 2.2 0 0 1 2.18-1.9h2.05V6.1Zm1.8.75h3.7V6.1a1.85 1.85 0 0 0-3.7 0v.75Z" clipRule="evenodd" />
            )}
            {name === 'map' && (
                <path fill="currentColor" d="M8.15 3.05 3.7 4.92A1.15 1.15 0 0 0 3 5.98v14.15c0 .61.62 1.03 1.18.79l4.47-1.88V3.36a.34.34 0 0 0-.5-.31Zm2.15.12v15.87l3.4 1.8V4.96l-3.4-1.8Zm9.52-.09-4.47 1.88v15.68c0 .25.26.42.5.32l4.45-1.88a1.15 1.15 0 0 0 .7-1.06V3.87c0-.61-.62-1.03-1.18-.79Z" />
            )}
            {name === 'topka' && (
                <path fill="currentColor" d="M12.8 2.35c.55 3.63-1.42 5.14-3.13 6.93-1.32 1.38-2.47 2.91-2.47 5.33 0 .86.18 1.62.51 2.27-1.76-1.1-2.91-3.07-2.91-5.35 0-3.1 1.73-5.68 4.72-8.07.17 1.92.69 3.08 1.26 3.74.87-1.16 1.47-2.69 2.02-4.85Zm1.59 6.04c3.1 2.14 4.81 4.78 4.81 7.38A6.2 6.2 0 0 1 7.46 18.6c.87.66 1.97 1.05 3.16 1.05 2.83 0 5.13-2.22 5.13-4.97 0-1.73-.58-3.62-1.36-6.29Z" />
            )}
            {name === 'profile' && (
                <path fill="currentColor" d="M12 12.15a4.8 4.8 0 1 0 0-9.6 4.8 4.8 0 0 0 0 9.6Zm0 1.65c-5.08 0-8.5 2.55-8.5 5.1 0 1.4 1.12 2.55 2.5 2.55h12c1.38 0 2.5-1.15 2.5-2.55 0-2.55-3.42-5.1-8.5-5.1Z" />
            )}
            {name === 'cart' && (
                <path fill="currentColor" fillRule="evenodd" d="M2.8 3.2a1 1 0 0 1 1-1h1.05c.9 0 1.69.6 1.93 1.47l.3 1.08h12.03c1.3 0 2.26 1.23 1.93 2.48l-1.55 5.9a3 3 0 0 1-2.9 2.24H9.03l.24.88h8.98a1 1 0 1 1 0 2H8.5a1 1 0 0 1-.96-.73L4.85 4.2H3.8a1 1 0 0 1-1-1Zm5.9 16.05a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3Zm9.1 0a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3Z" clipRule="evenodd" />
            )}
            {name === 'coupon' && (
                <path fill="currentColor" d="M4.25 4h15.5A2.25 2.25 0 0 1 22 6.25v2.03a3.75 3.75 0 0 0 0 7.44v2.03A2.25 2.25 0 0 1 19.75 20H4.25A2.25 2.25 0 0 1 2 17.75v-2.03a3.75 3.75 0 0 0 0-7.44V6.25A2.25 2.25 0 0 1 4.25 4Zm7 2.4v2.1h1.5V6.4h-1.5Zm0 4.05v3.1h1.5v-3.1h-1.5Zm0 5.05v2.1h1.5v-2.1h-1.5Z" />
            )}
            {name === 'search' && (
                <path fill="currentColor" fillRule="evenodd" d="M10.7 3a7.7 7.7 0 1 0 4.72 13.79l3.9 3.9a.97.97 0 0 0 1.37-1.38l-3.9-3.89A7.7 7.7 0 0 0 10.7 3Zm-5.75 7.7a5.75 5.75 0 1 1 11.5 0 5.75 5.75 0 0 1-11.5 0Z" clipRule="evenodd" />
            )}
        </svg>
    );
}
