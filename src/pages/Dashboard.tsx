import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Users, Building2, FileText, AlertTriangle, TrendingUp, Bell } from 'lucide-react'
import { Card, Badge, Btn } from '../components/ui'
import { inquilinosDB, imoveisDB, contratosDB, pagamentosDB } from '../lib/storage'
import { formatMoeda, formatData, contratoVencendoEm, contratoVencido, mesAtual } from '../lib/utils'
import { calcularAlertas, solicitarPermissaoNotificacao, dispararNotificacoes } from '../lib/notificacoes'

export default function Dashboard() {
  const alertas = useMemo(() => calcularAlertas(5), [])

  function ativarNotificacoes() {
    solicitarPermissaoNotificacao().then(ok => {
      if (ok) dispararNotificacoes(alertas)
      else alert('Permissão de notificação negada. Ative nas configurações do navegador.')
    })
  }

  const data = useMemo(() => {
    const inquilinos = inquilinosDB.list()
    const imoveis = imoveisDB.list()
    const contratos = contratosDB.list()
    const pagamentos = pagamentosDB.list()
    const mes = mesAtual()

    const ativos = contratos.filter(c => c.status === 'ativo')
    const pagsMes = pagamentos.filter(p => p.mes_referencia === mes)
    const recebido = pagsMes.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0)
    const pendente = pagsMes.filter(p => p.status !== 'pago').reduce((s, p) => s + p.valor, 0)
    const atrasados = pagamentos.filter(p => p.status === 'atrasado')
    const vencendo = ativos.filter(c => contratoVencendoEm(c.data_fim))
    const vencidos = ativos.filter(c => contratoVencido(c.data_fim))

    return { inquilinos, imoveis, ativos, recebido, pendente, atrasados, vencendo, vencidos, pagsMes }
  }, [])

  const stats = [
    { label: 'Inquilinos', value: data.inquilinos.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', to: '/inquilinos' },
    { label: 'Imóveis', value: data.imoveis.length, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50', to: '/imoveis' },
    { label: 'Contratos Ativos', value: data.ativos.length, icon: FileText, color: 'text-green-600', bg: 'bg-green-50', to: '/contratos' },
    { label: 'Pagamentos Atrasados', value: data.atrasados.length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', to: '/pagamentos' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Visão geral do mês atual</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Link key={s.label} to={s.to}>
            <Card className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon size={20} className={s.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Financeiro do mês */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-green-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Financeiro do Mês</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Recebido</span>
              <span className="font-semibold text-green-600">{formatMoeda(data.recebido)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">A receber</span>
              <span className="font-semibold text-yellow-600">{formatMoeda(data.pendente)}</span>
            </div>
            <hr className="border-slate-200" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Total esperado</span>
              <span className="font-bold text-slate-900">{formatMoeda(data.recebido + data.pendente)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell size={18} className={alertas.length > 0 ? 'text-red-500' : 'text-slate-400'} />
              <h2 className="font-semibold text-slate-900 text-sm">
                Alertas {alertas.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{alertas.length}</span>}
              </h2>
            </div>
            {'Notification' in window && Notification.permission !== 'granted' && (
              <Btn variant="ghost" size="sm" onClick={ativarNotificacoes} className="text-xs text-blue-600">
                <Bell size={12} /> Ativar avisos
              </Btn>
            )}
          </div>
          {alertas.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Nenhum alerta pendente</p>
          ) : (
            <div className="space-y-2">
              {alertas.slice(0, 6).map(a => {
                const cor = a.tipo === 'pagamento_atrasado' ? 'red'
                  : a.tipo === 'pagamento_hoje' ? 'red'
                  : a.tipo === 'contrato_vencendo' ? 'yellow'
                  : 'yellow'
                const label = a.tipo === 'pagamento_atrasado' ? 'Atrasado'
                  : a.tipo === 'pagamento_hoje' ? 'Vence hoje'
                  : a.tipo === 'contrato_vencendo' ? 'Contrato'
                  : `${a.diasRestantes}d`
                return (
                  <div key={a.id + a.tipo} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{a.titulo}</p>
                      <p className="text-xs text-slate-500 truncate">{a.mensagem}</p>
                    </div>
                    <Badge variant={cor as any}>{label}</Badge>
                  </div>
                )
              })}
              {alertas.length > 6 && (
                <p className="text-xs text-slate-400 text-center pt-1">+{alertas.length - 6} outros alertas</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Contratos ativos recentes */}
      {data.ativos.length > 0 && (
        <Card>
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Contratos Ativos</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {data.ativos.slice(0, 5).map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{c.inquilino?.nome ?? '-'}</p>
                  <p className="text-xs text-slate-500">{c.imovel?.endereco ?? '-'} · Vence {formatData(c.data_fim)}</p>
                </div>
                <span className="font-semibold text-slate-900 text-sm">{formatMoeda(c.valor_mensal)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
