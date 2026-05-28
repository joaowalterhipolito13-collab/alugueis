import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, FileText } from 'lucide-react'
import { Card, Btn, Input, Select, Textarea, Modal, PageHeader, EmptyState, Badge } from '../components/ui'
import { contratosDB, inquilinosDB, imoveisDB } from '../lib/storage'
import { formatMoeda, formatData, STATUS_LABEL, contratoVencendoEm, contratoVencido } from '../lib/utils'
import type { Contrato } from '../lib/supabase'

const EMPTY = {
  inquilino_id: '', imovel_id: '', data_inicio: '', data_fim: '',
  valor_mensal: 0, dia_vencimento: 10, indice_reajuste: 'IGPM' as const,
  status: 'ativo' as const, observacoes: '',
}

const STATUS_COLOR: Record<string, 'green' | 'gray' | 'red'> = {
  ativo: 'green', encerrado: 'gray', rescindido: 'red',
}

export default function Contratos() {
  const [lista, setLista] = useState(() => contratosDB.list())
  const [inquilinos] = useState(() => inquilinosDB.list())
  const [imoveis] = useState(() => imoveisDB.list())
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtrado = useMemo(() => {
    return lista.filter(c => {
      const matchBusca =
        c.inquilino?.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.imovel?.endereco.toLowerCase().includes(busca.toLowerCase()) ||
        c.imovel?.descricao.toLowerCase().includes(busca.toLowerCase())
      const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus
      return matchBusca && matchStatus
    })
  }, [lista, busca, filtroStatus])

  function refresh() { setLista(contratosDB.list()) }

  function abrirNovo() { setForm(EMPTY); setEditId(null); setModal('novo') }

  function abrirEditar(c: Contrato) {
    const { id, criado_em, inquilino, imovel, ...rest } = c
    setForm(rest as typeof EMPTY)
    setEditId(id)
    setModal('editar')
  }

  function salvar() {
    if (!form.inquilino_id || !form.imovel_id || !form.data_inicio || !form.data_fim) return
    if (editId) {
      contratosDB.update(editId, form)
    } else {
      contratosDB.create(form)
    }
    refresh()
    setModal(null)
  }

  function set(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function alertaBadge(c: Contrato) {
    if (contratoVencido(c.data_fim) && c.status === 'ativo')
      return <Badge variant="red">Vencido</Badge>
    if (contratoVencendoEm(c.data_fim) && c.status === 'ativo')
      return <Badge variant="yellow">Vence em breve</Badge>
    return null
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contratos"
        subtitle={`${lista.filter(c => c.status === 'ativo').length} ativo${lista.filter(c => c.status === 'ativo').length !== 1 ? 's' : ''}`}
        action={<Btn onClick={abrirNovo}><Plus size={16} /> Novo Contrato</Btn>}
      />

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por inquilino ou imóvel..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="todos">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="encerrado">Encerrados</option>
          <option value="rescindido">Rescindidos</option>
        </select>
      </div>

      <Card>
        {filtrado.length === 0 ? (
          <EmptyState message={busca ? 'Nenhum contrato encontrado' : 'Nenhum contrato cadastrado ainda'} />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtrado.map(c => (
              <div key={c.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-full">
                    <FileText size={16} className="text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900">{c.inquilino?.nome ?? '-'}</p>
                      <Badge variant={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                      {alertaBadge(c)}
                    </div>
                    <p className="text-xs text-slate-500">{c.imovel?.descricao ?? '-'} · {c.imovel?.endereco ?? '-'}</p>
                    <p className="text-xs text-slate-400">
                      {formatData(c.data_inicio)} até {formatData(c.data_fim)} · Vence dia {c.dia_vencimento}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 text-sm">{formatMoeda(c.valor_mensal)}</span>
                  <Btn variant="ghost" size="sm" onClick={() => abrirEditar(c)}><Pencil size={14} /></Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setDeleteId(c.id)} className="text-red-500 hover:bg-red-50"><Trash2 size={14} /></Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {modal && (
        <Modal title={modal === 'novo' ? 'Novo Contrato' : 'Editar Contrato'} onClose={() => setModal(null)} size="lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Select label="Inquilino *" value={form.inquilino_id} onChange={e => set('inquilino_id', e.target.value)}>
                <option value="">Selecione o inquilino</option>
                {inquilinos.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </Select>
            </div>
            <div className="col-span-2">
              <Select label="Imóvel *" value={form.imovel_id} onChange={e => set('imovel_id', e.target.value)}>
                <option value="">Selecione o imóvel</option>
                {imoveis.map(i => <option key={i.id} value={i.id}>{i.descricao} — {i.endereco}</option>)}
              </Select>
            </div>
            <Input label="Data de início *" type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} />
            <Input label="Data de término *" type="date" value={form.data_fim} onChange={e => set('data_fim', e.target.value)} />
            <Input label="Valor mensal (R$) *" type="number" min="0" step="0.01" value={form.valor_mensal} onChange={e => set('valor_mensal', parseFloat(e.target.value) || 0)} />
            <Input label="Dia de vencimento" type="number" min="1" max="31" value={form.dia_vencimento} onChange={e => set('dia_vencimento', parseInt(e.target.value) || 10)} />
            <Select label="Índice de reajuste" value={form.indice_reajuste} onChange={e => set('indice_reajuste', e.target.value)}>
              <option value="IGPM">IGP-M</option>
              <option value="IPCA">IPCA</option>
              <option value="INPC">INPC</option>
              <option value="fixo">Fixo</option>
            </Select>
            <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="ativo">Ativo</option>
              <option value="encerrado">Encerrado</option>
              <option value="rescindido">Rescindido</option>
            </Select>
            <div className="col-span-2">
              <Textarea label="Observações" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={!form.inquilino_id || !form.imovel_id || !form.data_inicio || !form.data_fim}>Salvar</Btn>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-slate-700 mb-5">Tem certeza que deseja excluir este contrato?</p>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => { contratosDB.delete(deleteId!); refresh(); setDeleteId(null) }}>Excluir</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
