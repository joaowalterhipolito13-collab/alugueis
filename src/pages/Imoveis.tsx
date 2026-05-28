import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, Building2 } from 'lucide-react'
import { Card, Btn, Input, Select, Modal, PageHeader, EmptyState, Badge } from '../components/ui'
import { imoveisDB } from '../lib/storage'
import { formatMoeda, TIPO_IMOVEL_LABEL } from '../lib/utils'
import type { Imovel } from '../lib/supabase'

const EMPTY: Omit<Imovel, 'id' | 'criado_em'> = {
  descricao: '', endereco: '', tipo: 'casa', valor_base: 0,
}

const TIPO_COLOR: Record<string, 'blue' | 'green' | 'yellow' | 'gray'> = {
  casa: 'green', apartamento: 'blue', sala_comercial: 'yellow', outro: 'gray',
}

export default function Imoveis() {
  const [lista, setLista] = useState(() => imoveisDB.list())
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const [form, setForm] = useState<Omit<Imovel, 'id' | 'criado_em'>>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtrado = useMemo(() =>
    lista.filter(i =>
      i.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      i.endereco.toLowerCase().includes(busca.toLowerCase())
    ), [lista, busca])

  function refresh() { setLista(imoveisDB.list()) }

  function abrirNovo() { setForm(EMPTY); setEditId(null); setModal('novo') }

  function abrirEditar(i: Imovel) {
    const { id, criado_em, ...rest } = i
    setForm(rest)
    setEditId(id)
    setModal('editar')
  }

  function salvar() {
    if (!form.descricao.trim() || !form.endereco.trim()) return
    if (editId) {
      imoveisDB.update(editId, form)
    } else {
      imoveisDB.create(form)
    }
    refresh()
    setModal(null)
  }

  function set(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Imóveis"
        subtitle={`${lista.length} imóvel${lista.length !== 1 ? 'eis' : ''} cadastrado${lista.length !== 1 ? 's' : ''}`}
        action={<Btn onClick={abrirNovo}><Plus size={16} /> Novo Imóvel</Btn>}
      />

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por descrição ou endereço..."
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Card>
        {filtrado.length === 0 ? (
          <EmptyState message={busca ? 'Nenhum imóvel encontrado' : 'Nenhum imóvel cadastrado ainda'} />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtrado.map(i => (
              <div key={i.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-full">
                    <Building2 size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{i.descricao}</p>
                      <Badge variant={TIPO_COLOR[i.tipo]}>{TIPO_IMOVEL_LABEL[i.tipo]}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">{i.endereco}</p>
                    <p className="text-xs text-slate-400">Valor base: {formatMoeda(i.valor_base)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Btn variant="ghost" size="sm" onClick={() => abrirEditar(i)}><Pencil size={14} /></Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setDeleteId(i.id)} className="text-red-500 hover:bg-red-50"><Trash2 size={14} /></Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {modal && (
        <Modal title={modal === 'novo' ? 'Novo Imóvel' : 'Editar Imóvel'} onClose={() => setModal(null)} size="lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Descrição / Nome *" value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex: Apto 102 - Bloco A" />
            </div>
            <div className="col-span-2">
              <Input label="Endereço completo *" value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade - UF" />
            </div>
            <Select label="Tipo" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <option value="casa">Casa</option>
              <option value="apartamento">Apartamento</option>
              <option value="sala_comercial">Sala Comercial</option>
              <option value="outro">Outro</option>
            </Select>
            <Input
              label="Valor base (R$)"
              type="number"
              min="0"
              step="0.01"
              value={form.valor_base}
              onChange={e => set('valor_base', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={!form.descricao.trim() || !form.endereco.trim()}>Salvar</Btn>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-slate-700 mb-5">Tem certeza que deseja excluir este imóvel?</p>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => { imoveisDB.delete(deleteId!); refresh(); setDeleteId(null) }}>Excluir</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
