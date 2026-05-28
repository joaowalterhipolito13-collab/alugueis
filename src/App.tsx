import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { calcularAlertas, solicitarPermissaoNotificacao, dispararNotificacoes, deveNotificarHoje, marcarNotificadoHoje } from './lib/notificacoes'
import { gerarCobrancasAutomaticas } from './lib/storage'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Inquilinos from './pages/Inquilinos'
import Imoveis from './pages/Imoveis'
import Contratos from './pages/Contratos'
import Pagamentos from './pages/Pagamentos'
import Relatorios from './pages/Relatorios'
import Terrenos from './pages/Terrenos'

export default function App() {
  useEffect(() => {
    gerarCobrancasAutomaticas()
  }, [])

  useEffect(() => {
    if (!deveNotificarHoje()) return
    const alertas = calcularAlertas(5)
    if (alertas.length === 0) return
    solicitarPermissaoNotificacao().then(ok => {
      if (ok) {
        dispararNotificacoes(alertas)
        marcarNotificadoHoje()
      }
    })
  }, [])

  return (
    <BrowserRouter basename="/alugueis/">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inquilinos" element={<Inquilinos />} />
          <Route path="imoveis" element={<Imoveis />} />
          <Route path="contratos" element={<Contratos />} />
          <Route path="pagamentos" element={<Pagamentos />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="terrenos" element={<Terrenos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
