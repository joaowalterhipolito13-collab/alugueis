import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, User } from 'lucide-react'
import { Card, Btn, Input, Textarea, Modal, PageHeader, EmptyState } from '../components/ui'
import { inquilinosDB } from '../lib/storage'
import { cpfMask, telefoneMask, formatData } from '../lib/utils'
import type { Inquilino } from '../lib/supabase'

const EMPTY: Omit<Inquilino, 'id' | 'criado_em'> = {
  nome: '', cpf: '', rg: '', telefone: '', email: '', endereco_anterior: '',
}

export default function Inquilinos() {
  const [lista, setLista] = useState(() => inquilinosDB.list())
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtrado = useMemo(() =>
    lista.filter(i =>
      i.nome.toLowerCase().includes(busca.toLowerCase()) ||
      i.cpf.includes(busca) ||
      i.telefone.includes(busca)
    ), [lista, busca])

  function refresh() { setLista(inquilinosDB.list()) }

  function abrirNovo() {
    setForm(EMPTY)
    setEditId(null)
    setModal('novo')
  }

  function abrirEditar(i: Inquilino) {
    const { id, criado_em, ...rest } = i
    setForm(rest)
    setEditId(id)
    setModal('editar')
  }

  function salvar() {
    if (!form.nome.trim()) return
    if (editId) {
      inquilinosDB.update(editId, form)
    } else {
      inquilinosDB.create(form)
    }
    refresh()
    setModal(null)
  }

  function confirmarDelete() {
    if (deleteId) {
      inquilinosDB.delete(deleteId)
      refresh()
      setDeleteId(null)
    }
  }

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inquilinos"
        subtitle={`${lista.length} cadastrado${lista.length !== 1 ? 's' : ''}`}
        action={<Btn onClick={abrirNovo}><Plus size={16} /> Novo Inquilino</Btn>}
      />

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF ou telefone..."
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Card>
        {filtrado.length === 0 ? (
          <EmptyState message={busca ? 'Nenhum inquilino encontrado' : 'Nenhum inquilino cadastrado ainda'} />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtrado.map(i => (
              <div key={i.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-full">
                    <User size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{i.nome}</p>
                    <p className="text-xs text-slate-500">
                      CPF: {i.cpf || '-'} · {i.telefone || '-'} · {i.email || '-'}
                    </p>
                    <p className="text-xs text-slate-400">Cadastrado em {formatData(i.criado_em)}</p>
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

      {/* Modal novo/editar */}
      {modal && (
        <Modal
          title={modal === 'novo' ? 'Novo Inquilino' : 'Editar Inquilino'}
          onClose={() => setModal(null)}
          size="lg"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nome completo *" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="João da Silva" />
            </div>
            <Input label="CPF" value={form.cpf} onChange={e => set('cpf', cpfMask(e.target.value))} placeholder="000.000.000-00" />
            <Input label="RG" value={form.rg} onChange={e => set('rg', e.target.value)} placeholder="0000000" />
            <Input label="Telefone" value={form.telefone} onChange={e => set('telefone', telefoneMask(e.target.value))} placeholder="(11) 99999-9999" />
            <Input label="E-mail" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
            <div className="col-span-2">
              <Textarea label="Endereço anterior" value={form.endereco_anterior} onChange={e => set('endereco_anterior', e.target.value)} rows={2} placeholder="Rua anterior, número, bairro, cidade" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={!form.nome.trim()}>Salvar</Btn>
          </div>
        </Modal>
      )}

      {/* Modal confirmar exclusão */}
      {deleteId && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-slate-700 mb-5">Tem certeza que deseja excluir este inquilino? Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={confirmarDelete}>Excluir</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
