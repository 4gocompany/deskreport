import { useEffect } from "react"
import { useThemeStore } from "../store"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { theme } = useThemeStore()

    useEffect(() => {
        const root = window.document.documentElement

        const applyTheme = (t: string) => {
            root.classList.remove("light", "dark")
            if (t === "system") {
                const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light"
                root.classList.add(systemTheme)
                return
            }
            root.classList.add(t)
        }

        applyTheme(theme)

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const handleChange = () => applyTheme('system')
            mediaQuery.addEventListener('change', handleChange)
            return () => mediaQuery.removeEventListener('change', handleChange)
        }
    }, [theme])

    return <>{children}</>
}
