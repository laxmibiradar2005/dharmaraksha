import React from 'react'
import ReactDOM from 'react-dom/client'
import { LanguageProvider } from './context/LanguageContext'
import Router from './Router'
import { AgentProvider } from './context/AgentContext'
import './index.css'
import './theme.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><LanguageProvider><AgentProvider><Router /></AgentProvider></LanguageProvider></React.StrictMode>,
)
