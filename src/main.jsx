import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { defineCustomElements } from "@arcgis/map-components/dist/loader";

defineCustomElements(window, {
  resourcesUrl: "https://js.arcgis.com/map-components/4.30/assets",
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
