import type { ImgHTMLAttributes } from 'react'

/**
 * A logo in two colourways: the carbon version for the light theme and the
 * ivory version for the dark one. Both are in the page; CSS shows the one that
 * matches html[data-theme] (see glass.css), so a theme switch needs no re-render.
 */
type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { light: string; dark: string }

export default function ThemedImg({ light, dark, className = '', alt = '', ...rest }: Props) {
  return (
    <>
      <img {...rest} src={light} alt={alt} className={`${className} themed-img themed-img--light`.trim()} />
      <img {...rest} src={dark} alt="" aria-hidden="true" className={`${className} themed-img themed-img--dark`.trim()} />
    </>
  )
}
