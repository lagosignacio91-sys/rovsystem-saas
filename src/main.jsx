import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './theme/theme.css'
import './index.css'
import { ThemeProvider } from './theme/ThemeProvider'
import { AppConfigProvider } from './hooks/AppConfigProvider'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppConfigProvider>
        <App />
      </AppConfigProvider>
    </ThemeProvider>
  </React.StrictMode>
)