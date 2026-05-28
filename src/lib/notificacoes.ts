import { pagamentosDB, contratosDB } from './storage'
import { differenceInDays, parseISO } from 'date-fns'
import { formatMoeda, formatData } from './utils'

export interface Alerta {
  tipo: 'pagamento_hoje' | 'pagamento_proximo' | 'pagamento_atrasado' | 'contrato_vencendo'
  titulo: string
  mensagem: string
  diasRestantes: number
  id: string
}

export function calcularAlertas(diasAntecedencia = 5): Alerta[] {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const alertas: Alerta[] = []

  // Pagamentos pendentes/atrasados
  const pagamentos = pagamentosDB.list().filter(p => p.status !== 'pago')
  for (const p of pagamentos) {
    if (!p.data_vencimento) continue
    const venc = parseISO(p.data_vencimento)
    const diff = differenceInDays(venc, hoje)
    const nome = p.contrato?.inquilino?.nome ?? 'Inquilino'
    const imovel = p.contrato?.imovel?.descricao ?? ''
    const valor = formatMoeda(p.valor)

    if (diff < 0) {
      alertas.push({
        tipo: 'pagamento_atrasado',
        titulo: `Pagamento atrasado — ${nome}`,
        mensagem: `${imovel ? imovel + ' · ' : ''}${valor} · venceu em ${formatData(p.data_vencimento)} (${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? 's' : ''} atrás)`,
        diasRestantes: diff,
        id: p.id,
      })
    } else if (diff === 0) {
      alertas.push({
        tipo: 'pagamento_hoje',
        titulo: `Vence hoje — ${nome}`,
        mensagem: `${imovel ? imovel + ' · ' : ''}${valor}`,
        diasRestantes: 0,
        id: p.id,
      })
    } else if (diff <= diasAntecedencia) {
      alertas.push({
        tipo: 'pagamento_proximo',
        titulo: `Vence em ${diff} dia${diff !== 1 ? 's' : ''} — ${nome}`,
        mensagem: `${imovel ? imovel + ' · ' : ''}${valor} · vence em ${formatData(p.data_vencimento)}`,
        diasRestantes: diff,
        id: p.id,
      })
    }
  }

  // Contratos prestes a vencer
  const contratos = contratosDB.list().filter(c => c.status === 'ativo')
  for (const c of contratos) {
    if (!c.data_fim) continue
    const fim = parseISO(c.data_fim)
    const diff = differenceInDays(fim, hoje)
    const nome = c.inquilino?.nome ?? 'Inquilino'
    const imovel = c.imovel?.descricao ?? ''

    if (diff >= 0 && diff <= 30) {
      alertas.push({
        tipo: 'contrato_vencendo',
        titulo: `Contrato vence em ${diff} dia${diff !== 1 ? 's' : ''} — ${nome}`,
        mensagem: `${imovel ? imovel + ' · ' : ''}Fim do contrato: ${formatData(c.data_fim)}`,
        diasRestantes: diff,
        id: c.id,
      })
    }
  }

  // Ordena: atrasados primeiro, depois por proximidade
  return alertas.sort((a, b) => a.diasRestantes - b.diasRestantes)
}

export async function solicitarPermissaoNotificacao(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function dispararNotificacoes(alertas: Alerta[]) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (alertas.length === 0) return

  // Agrupa em uma única notificação se forem muitos
  if (alertas.length === 1) {
    new Notification(alertas[0].titulo, {
      body: alertas[0].mensagem,
      icon: '/alugueis/favicon.ico',
      tag: 'aluguel-alerta',
    })
  } else {
    const atrasados = alertas.filter(a => a.tipo === 'pagamento_atrasado').length
    const hoje = alertas.filter(a => a.tipo === 'pagamento_hoje').length
    const proximos = alertas.filter(a => a.tipo === 'pagamento_proximo').length

    const partes = []
    if (atrasados > 0) partes.push(`${atrasados} pagamento${atrasados > 1 ? 's' : ''} atrasado${atrasados > 1 ? 's' : ''}`)
    if (hoje > 0) partes.push(`${hoje} vence${hoje > 1 ? 'm' : ''} hoje`)
    if (proximos > 0) partes.push(`${proximos} vence${proximos > 1 ? 'm' : ''} em breve`)

    new Notification(`Gestão de Aluguéis — ${alertas.length} alertas`, {
      body: partes.join(' · '),
      icon: '/alugueis/favicon.ico',
      tag: 'aluguel-alerta',
    })
  }
}

// Chave para não disparar notificação mais de uma vez por dia
const NOTIF_KEY = 'alug_ultima_notificacao'

export function deveNotificarHoje(): boolean {
  const ultima = localStorage.getItem(NOTIF_KEY)
  const hoje = new Date().toISOString().slice(0, 10)
  return ultima !== hoje
}

export function marcarNotificadoHoje() {
  localStorage.setItem(NOTIF_KEY, new Date().toISOString().slice(0, 10))
}
