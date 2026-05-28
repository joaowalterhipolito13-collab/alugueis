import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, MapPin } from 'lucide-react'
import { Card, Btn, Input, Textarea, Modal, PageHeader, EmptyState } from '../components/ui'
import { formatMoeda, formatData } from '../lib/utils'

interface Terreno {
  id: string
  endereco: string
  descricao: string
  valor_pago: number
  data_compra: string
  observacoes: string
  criado_em: string
}

const STORAGE_KEY = 'alug_terrenos'

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

function listar(): Terreno[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function salvarTodos(data: Terreno[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const EMPTY = { endereco: '', descricao: '', valor_pago: 0, data_compra: '', observacoes: '' }

export default function Terrenos() {
  const [lista, setLista] = useState(() => listar())
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtrado = useMemo(() =>
    lista.filter(t =>
      t.endereco.toLowerCase().includes(busca.toLowerCase()) ||
      t.descricao.toLowerCase().includes(busca.toLowerCase())
    ), [lista, busca])

  const totalInvestido = useMemo(() =>
    lista.reduce((s, t) => s + t.valor_pago, 0), [lista])

  function refresh() { setLista(listar()) }

  function abrirNovo() { setForm(EMPTY); setEditId(null); setModal('novo') }

  function abrirEditar(t: Terreno) {
    const { id, criado_em, ...rest } = t
    setForm(rest)
    setEditId(id)
    setModal('editar')
  }

  function salvar() {
    if (!form.endereco.trim()) return
    const todos = listar()
    if (editId) {
      const idx = todos.findIndex(t => t.id === editId)
      if (idx !== -1) todos[idx] = { ...todos[idx], ...form }
      salvarTodos(todos)
    } else {
      salvarTodos([...todos, { ...form, id: uuid(), criado_em: new Date().toISOString() }])
    }
    refresh()
    setModal(null)
  }

  function excluir() {
    salvarTodos(listar().filter(t => t.id !== deleteId))
    refresh()
    setDeleteId(null)
  }

  function set(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Terrenos"
        subtitle={`${lista.length} terreno${lista.length !== 1 ? 's' : ''} cadastrado${lista.length !== 1 ? 's' : ''}`}
        action={<Btn onClick={abrirNovo}><Plus size={16} /> Novo Terreno</Btn>}
      />

      {lista.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">Total investido em terrenos</span>
          <span className="text-lg font-bold text-blue-800">{formatMoeda(totalInvestido)}</span>
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por endereço ou descrição..."
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Card>
        {filtrado.length === 0 ? (
          <EmptyState message={busca ? 'Nenhum terreno encontrado' : 'Nenhum terreno cadastrado ainda'} />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtrado.map(t => (
              <div key={t.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-full">
                    <MapPin size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.endereco}</p>
                    {t.descricao && <p className="text-xs text-slate-500">{t.descricao}</p>}
                    <p className="text-xs text-slate-400">
                      {t.data_compra ? `Comprado em ${formatData(t.data_compra)}` : 'Data não informada'}
                      {t.observacoes ? ` · ${t.observacoes}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 text-sm">{formatMoeda(t.valor_pago)}</span>
                  <Btn variant="ghost" size="sm" onClick={() => abrirEditar(t)}><Pencil size={14} /></Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setDeleteId(t.id)} className="text-red-500 hover:bg-red-50"><Trash2 size={14} /></Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {modal && (
        <Modal title={modal === 'novo' ? 'Novo Terreno' : 'Editar Terreno'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Input
              label="Endereço *"
              value={form.endereco}
              onChange={e => set('endereco', e.target.value)}
              placeholder="Rua, número, bairro, cidade - UF"
            />
            <Input
              label="Descrição / Identificação"
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Ex: Lote 12, Quadra 5 — Jardim das Flores"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Valor pago (R$)"
                type="number"
                min="0"
                step="0.01"
                value={form.valor_pago}
                onChange={e => set('valor_pago', parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Data da compra"
                type="date"
                value={form.data_compra}
                onChange={e => set('data_compra', e.target.value)}
              />
            </div>
            <Textarea
              label="Observações"
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
              rows={2}
              placeholder="Informações adicionais, matrícula, cartório..."
            />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={!form.endereco.trim()}>Salvar</Btn>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-slate-700 mb-5">Deseja excluir este terreno? Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={excluir}>Excluir</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
