import type { ComponentProps } from 'react'
import { Text } from '@react-three/drei'
import sceneFontUrl from '../assets/fonts/DejaVuSans-scene.woff?url'

/** The bundled 3D-label font (DejaVu Sans subset, see assets/fonts/LICENSE-DejaVu.txt).
 *  Without an explicit font troika resolves glyphs per character from a CDN, and
 *  symbols such as the subscript in 2₁ rendered as a boxed-X missing glyph. */
export const SCENE_FONT_URL: string = sceneFontUrl

/** drei `<Text>` with the bundled font: every 3D text label goes through this. */
export function SceneText(props: ComponentProps<typeof Text>) {
  return <Text font={SCENE_FONT_URL} {...props} />
}
