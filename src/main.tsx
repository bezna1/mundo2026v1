import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

const storedTheme = localStorage.getItem('mt_theme') === 'light' ? 'light' : 'dark'
document.documentElement.dataset.theme = storedTheme

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
