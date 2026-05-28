import { useState, useMemo } from 'react'
import { Plus, Search, CheckCircle, Clock, AlertCircle, Pencil, Trash2 } from 'lucide-react'
import { Card, Btn, Input, Select, Textarea, Modal, PageHeader, EmptyState, Badge } from '../components/ui'
import { pagamentosDB, contratosDB } from '../lib/storage'
import { formatMoeda, formatData, mesAtual } from '../lib/utils'
import type { Pagamento } from '../lib/supabase'

const EMPTY = {
  contrato_id: '', mes_referencia: mesAtual(), valor: 0,
  data_vencimento: '', data_pagamento: '', status: 'pendente' as 'pago' | 'pendente' | 'atrasado', observacoes: '',
}

const STATUS_ICON = {
  pago: <CheckCircle size={16} className="text-green-600" />,
  pendente: <Clock size={16} className="text-yellow-600" />,
  atrasado: <AlertCircle size={16} className="text-red-600" />,
}

const STATUS_COLOR: Record<string, 'green' | 'yellow' | 'red'> = {
  pago: 'green', pendente: 'yellow', atrasado: 'red',
}

const STATUS_LABEL: Record<string, string> = {
  pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado',
}

export default function Pagamentos() {
  const [lista, setLista] = useState(() => pagamentosDB.list())
  const [contratos] = useState(() => contratosDB.list().filter(c => c.status === 'ativo'))
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroMes, setFiltroMes] = useState(mesAtual())
  const [modal, setModal] = useState<'novo' | 'editar' | 'registrar' | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtrado = useMemo(() => {
    return lista.filter(p => {
      const nome = p.contrato?.inquilino?.nome?.toLowerCase() ?? ''
      const matchBusca = nome.includes(busca.toLowerCase())
      const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus
      const matchMes = !filtroMes || p.mes_referencia === filtroMes
      return matchBusca && matchStatus && matchMes
    })
  }, [lista, busca, filtroStatus, filtroMes])

  const totais = useMemo(() => ({
    pago: filtrado.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0),
    pendente: filtrado.filter(p => p.status === 'pendente').reduce((s, p) => s + p.valor, 0),
    atrasado: filtrado.filter(p => p.status === 'atrasado').reduce((s, p) => s + p.valor, 0),
  }), [filtrado])

  function refresh() { setLista(pagamentosDB.list()) }

  function abrirNovo() { setForm(EMPTY); setEditId(null); setModal('novo') }

  function abrirEditar(p: Pagamento) {
    const { id, criado_em, contrato, ...rest } = p
    setForm({ ...rest, data_pagamento: rest.data_pagamento ?? '' })
    setEditId(id)
    setModal('editar')
  }

  function registrarPagamento(p: Pagamento) {
    const { id, criado_em, contrato, ...rest } = p
    setForm({ ...rest, data_pagamento: new Date().toISOString().split('T')[0], status: 'pago' })
    setEditId(id)
    setModal('registrar')
  }

  function salvar() {
    if (!form.contrato_id || !form.mes_referencia || !form.data_vencimento) return
    const payload = { ...form, data_pagamento: form.data_pagamento || null }
    if (editId) {
      pagamentosDB.update(editId, payload as any)
    } else {
      pagamentosDB.create(payload as any)
    }
    refresh()
    setModal(null)
  }

  function set(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Gerar cobranças do mês para contratos ativos
  function gerarCobrancasMes() {
    const mes = filtroMes || mesAtual()
    const existentes = pagamentosDB.list().filter(p => p.mes_referencia === mes).map(p => p.contrato_id)
    let criados = 0
    for (const c of contratos) {
      if (existentes.includes(c.id)) continue
      const [ano, m] = mes.split('-').map(Number)
      const vencimento = `${ano}-${String(m).padStart(2, '0')}-${String(c.dia_vencimento).padStart(2, '0')}`
      pagamentosDB.create({
        contrato_id: c.id, mes_referencia: mes, valor: c.valor_mensal,
        data_vencimento: vencimento, data_pagamento: null, status: 'pendente', observacoes: '',
      })
      criados++
    }
    refresh()
    if (criados > 0) alert(`${criados} cobrança${criados > 1 ? 's' : ''} gerada${criados > 1 ? 's' : ''}!`)
    else alert('Todas as cobranças do mês já foram geradas.')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pagamentos"
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={gerarCobrancasMes}>Gerar cobranças do mês</Btn>
            <Btn onClick={abrirNovo}><Plus size={16} /> Novo</Btn>
          </div>
        }
      />

      {/* Totais */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Recebido</p>
          <p className="font-bold text-green-600">{formatMoeda(totais.pago)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Pendente</p>
          <p className="font-bold text-yellow-600">{formatMoeda(totais.pendente)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Atrasado</p>
          <p className="font-bold text-red-600">{formatMoeda(totais.atrasado)}</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-40">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por inquilino..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <input
          type="month"
          value={filtroMes}
          onChange={e => setFiltroMes(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="todos">Todos</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="atrasado">Atrasado</option>
        </select>
      </div>

      <Card>
        {filtrado.length === 0 ? (
          <EmptyState message="Nenhum pagamento encontrado" />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtrado.map(p => (
              <div key={p.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {STATUS_ICON[p.status]}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{p.contrato?.inquilino?.nome ?? '-'}</p>
                      <Badge variant={STATUS_COLOR[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {p.contrato?.imovel?.descricao ?? '-'} · Ref: {p.mes_referencia}
                    </p>
                    <p className="text-xs text-slate-400">
                      Vence: {formatData(p.data_vencimento)}
                      {p.data_pagamento ? ` · Pago: ${formatData(p.data_pagamento)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{formatMoeda(p.valor)}</span>
                  {p.status !== 'pago' && (
                    <Btn variant="secondary" size="sm" onClick={() => registrarPagamento(p)}>
                      <CheckCircle size={14} /> Pago
                    </Btn>
                  )}
                  <Btn variant="ghost" size="sm" onClick={() => abrirEditar(p)}><Pencil size={14} /></Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setDeleteId(p.id)} className="text-red-500 hover:bg-red-50"><Trash2 size={14} /></Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(modal === 'novo' || modal === 'editar' || modal === 'registrar') && (
        <Modal
          title={modal === 'novo' ? 'Novo Pagamento' : modal === 'registrar' ? 'Registrar Pagamento' : 'Editar Pagamento'}
          onClose={() => setModal(null)}
          size="lg"
        >
          <div className="grid grid-cols-2 gap-4">
            {modal !== 'registrar' && (
              <div className="col-span-2">
                <Select label="Contrato *" value={form.contrato_id} onChange={e => set('contrato_id', e.target.value)}>
                  <option value="">Selecione o contrato</option>
                  {contratos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.inquilino?.nome} — {c.imovel?.descricao} ({formatMoeda(c.valor_mensal)})
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <Input label="Mês referência *" type="month" value={form.mes_referencia} onChange={e => set('mes_referencia', e.target.value)} />
            <Input label="Valor (R$) *" type="number" min="0" step="0.01" value={form.valor} onChange={e => set('valor', parseFloat(e.target.value) || 0)} />
            <Input label="Data de vencimento *" type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)} />
            <Input label="Data de pagamento" type="date" value={form.data_pagamento ?? ''} onChange={e => set('data_pagamento', e.target.value)} />
            <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="atrasado">Atrasado</option>
            </Select>
            <div className="col-span-2">
              <Textarea label="Observações" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={salvar}>Salvar</Btn>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-slate-700 mb-5">Deseja excluir este registro de pagamento?</p>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => { pagamentosDB.delete(deleteId!); refresh(); setDeleteId(null) }}>Excluir</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
