import { ThemeProvider } from './hooks/useTheme'
import { Layout } from './components/layout/Layout'

export default function App() {
  return (
    <ThemeProvider>
      <Layout />
    </ThemeProvider>
  )
}
