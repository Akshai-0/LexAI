import { useState, useEffect } from 'react'

export default function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('lexai-theme')
    return saved === 'dark'   // default: light
  })

  useEffect(() => {
    if (dark) {
      document.body.classList.add('dark')
      localStorage.setItem('lexai-theme', 'dark')
    } else {
      document.body.classList.remove('dark')
      localStorage.setItem('lexai-theme', 'light')
    }
  }, [dark])

  return { dark, toggle: () => setDark(d => !d) }
}
