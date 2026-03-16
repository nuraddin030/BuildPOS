import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import '../src/styles/variables.css'

// 2. Layout (Sidebar + Topbar)
import '../src/styles/layout.css'

// 3. Common Components (Button, Modal, Input, Table)
import '../src/styles/common.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)