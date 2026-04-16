import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import InstallPrompt from './components/InstallPrompt'
import './index.css'

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 640 }}>
          <h1 style={{ color: '#b91c1c' }}>App failed to render</h1>
          <pre style={{ background: '#f1f5f9', padding: 12, overflow: 'auto', fontSize: 13 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <p style={{ fontSize: 14, color: '#64748b' }}>Open the browser devtools console for the full stack trace.</p>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <InstallPrompt />
    </BrowserRouter>
  </RootErrorBoundary>
)
