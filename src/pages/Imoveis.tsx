import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, Building2, ChevronDown, ChevronUp, User, FileText, CreditCard } from 'lucide-react'
import { Card, Btn, Input, Select, Textarea, Modal, PageHeader, EmptyState, Badge } from '../components/ui'
import { imoveisDB, inquilinosDB, contratosDB } from '../lib/storage'
import { formatMoeda, formatData, cpfMask, telefoneMask, TIPO_IMOVEL_LABEL } from '../lib/utils'
import type { Imovel, Inquilino, Contrato } from '../lib/supabase'

const FORM_EMPTY = {
  // Imóvel
  descricao: '',
  endereco: '',
  tipo: 'casa' as Imovel['tipo'],
  // Inquilino
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  // Contrato
  data_inicio: '',
  data_fim: '',
  valor_mensal: 0,
  dia_vencimento: 10,
  indice_reajuste: 'IGPM' as Contrato['indice_reajuste'],
  banco: '',
  observacoes: '',
}

type FormType = typeof FORM_EMPTY

interface ImovelCompleto {
  imovel: Imovel
  inquilino?: Inquilino
  contrato?: Contrato
}

function carregarCompletos(): ImovelCompleto[] {
  const imoveis = imoveisDB.list()
  const contratos = contratosDB.list()
  return imoveis.map(imovel => {
    const contrato = contratos.find(c => c.imovel_id === imovel.id && c.status === 'ativo')
      ?? contratos.find(c => c.imovel_id === imovel.id)
    return { imovel, contrato, inquilino: contrato?.inquilino }
  })
}

const STATUS_COLOR: Record<string, 'green' | 'gray' | 'red'> = {
  ativo: 'green', encerrado: 'gray', rescindido: 'red',
}
const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo', encerrado: 'Encerrado', rescindido: 'Rescindido',
}

export default function Imoveis() {
  const [lista, setLista] = useState<ImovelCompleto[]>(() => carregarCompletos())
  const [busca, setBusca] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const [form, setForm] = useState<FormType>(FORM_EMPTY)
  const [editIds, setEditIds] = useState<{ imovelId?: string; inquilinoId?: string; contratoId?: string }>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtrado = useMemo(() =>
    lista.filter(({ imovel, inquilino }) =>
      imovel.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      imovel.endereco.toLowerCase().includes(busca.toLowerCase()) ||
      (inquilino?.nome ?? '').toLowerCase().includes(busca.toLowerCase())
    ), [lista, busca])

  function refresh() { setLista(carregarCompletos()) }

  function abrirNovo() {
    setForm(FORM_EMPTY)
    setEditIds({})
    setModal('novo')
  }

  function abrirEditar({ imovel, inquilino, contrato }: ImovelCompleto) {
    setForm({
      descricao: imovel.descricao,
      endereco: imovel.endereco,
      tipo: imovel.tipo,
      nome: inquilino?.nome ?? '',
      cpf: inquilino?.cpf ?? '',
      telefone: inquilino?.telefone ?? '',
      email: inquilino?.email ?? '',
      data_inicio: contrato?.data_inicio ?? '',
      data_fim: contrato?.data_fim ?? '',
      valor_mensal: contrato?.valor_mensal ?? 0,
      dia_vencimento: contrato?.dia_vencimento ?? 10,
      indice_reajuste: contrato?.indice_reajuste ?? 'IGPM',
      banco: contrato?.banco ?? '',
      observacoes: contrato?.observacoes ?? '',
    })
    setEditIds({
      imovelId: imovel.id,
      inquilinoId: inquilino?.id,
      contratoId: contrato?.id,
    })
    setModal('editar')
  }

  function salvar() {
    if (!form.descricao.trim() || !form.endereco.trim()) return

    if (modal === 'editar' && editIds.imovelId) {
      // Atualiza imóvel
      imoveisDB.update(editIds.imovelId, {
        descricao: form.descricao,
        endereco: form.endereco,
        tipo: form.tipo,
        valor_base: form.valor_mensal,
      })
      // Atualiza inquilino
      if (editIds.inquilinoId && form.nome.trim()) {
        inquilinosDB.update(editIds.inquilinoId, {
          nome: form.nome, cpf: form.cpf, telefone: form.telefone, email: form.email,
        })
      } else if (!editIds.inquilinoId && form.nome.trim()) {
        const novo = inquilinosDB.create({ nome: form.nome, cpf: form.cpf, telefone: form.telefone, email: form.email, rg: '', endereco_anterior: '' })
        if (editIds.contratoId) {
          contratosDB.update(editIds.contratoId, { inquilino_id: novo.id })
        }
      }
      // Atualiza contrato
      if (editIds.contratoId && form.data_inicio && form.data_fim) {
        contratosDB.update(editIds.contratoId, {
          data_inicio: form.data_inicio, data_fim: form.data_fim,
          valor_mensal: form.valor_mensal, dia_vencimento: form.dia_vencimento,
          indice_reajuste: form.indice_reajuste, banco: form.banco, observacoes: form.observacoes,
        })
      } else if (!editIds.contratoId && form.data_inicio && form.data_fim && form.nome.trim()) {
        const inq = editIds.inquilinoId ?? inquilinosDB.list().slice(-1)[0]?.id
        if (inq) {
          contratosDB.create({
            inquilino_id: inq, imovel_id: editIds.imovelId,
            data_inicio: form.data_inicio, data_fim: form.data_fim,
            valor_mensal: form.valor_mensal, dia_vencimento: form.dia_vencimento,
            indice_reajuste: form.indice_reajuste, status: 'ativo',
            banco: form.banco, observacoes: form.observacoes,
          })
        }
      }
    } else {
      // Cria imóvel
      const imovel = imoveisDB.create({
        descricao: form.descricao, endereco: form.endereco,
        tipo: form.tipo, valor_base: form.valor_mensal,
      })
      // Cria inquilino se nome preenchido
      if (form.nome.trim() && form.data_inicio && form.data_fim) {
        const inquilino = inquilinosDB.create({
          nome: form.nome, cpf: form.cpf, telefone: form.telefone,
          email: form.email, rg: '', endereco_anterior: '',
        })
        contratosDB.create({
          inquilino_id: inquilino.id, imovel_id: imovel.id,
          data_inicio: form.data_inicio, data_fim: form.data_fim,
          valor_mensal: form.valor_mensal, dia_vencimento: form.dia_vencimento,
          indice_reajuste: form.indice_reajuste, status: 'ativo',
          banco: form.banco, observacoes: form.observacoes,
        })
      }
    }

    refresh()
    setModal(null)
  }

  function excluirImovel() {
    if (!deleteId) return
    const item = lista.find(i => i.imovel.id === deleteId)
    if (item?.contrato) contratosDB.delete(item.contrato.id)
    if (item?.inquilino) {
      // Só exclui o inquilino se não tiver outros contratos
      const outrosContratos = contratosDB.list().filter(
        c => c.inquilino_id === item.inquilino!.id && c.id !== item.contrato?.id
      )
      if (outrosContratos.length === 0) inquilinosDB.delete(item.inquilino.id)
    }
    imoveisDB.delete(deleteId)
    refresh()
    setDeleteId(null)
  }

  function set(field: keyof FormType, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const ativos = lista.filter(i => i.contrato?.status === 'ativo').length
  const totalMensal = lista
    .filter(i => i.contrato?.status === 'ativo')
    .reduce((s, i) => s + (i.contrato?.valor_mensal ?? 0), 0)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Imóveis"
        subtitle={`${ativos} alugado${ativos !== 1 ? 's' : ''} · ${formatMoeda(totalMensal)}/mês`}
        action={<Btn onClick={abrirNovo}><Plus size={16} /> Novo Imóvel</Btn>}
      />

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por imóvel, endereço ou inquilino..."
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-3">
        {filtrado.length === 0 ? (
          <Card><EmptyState message="Nenhum imóvel cadastrado ainda" /></Card>
        ) : filtrado.map(({ imovel, inquilino, contrato }) => (
          <Card key={imovel.id}>
            <div
              className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-xl"
              onClick={() => setExpandido(expandido === imovel.id ? null : imovel.id)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-full">
                  <Building2 size={16} className="text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{imovel.descricao}</p>
                    <Badge variant="gray">{TIPO_IMOVEL_LABEL[imovel.tipo]}</Badge>
                    {contrato && <Badge variant={STATUS_COLOR[contrato.status]}>{STATUS_LABEL[contrato.status]}</Badge>}
                  </div>
                  <p className="text-xs text-slate-500">{imovel.endereco}</p>
                  {inquilino && (
                    <p className="text-xs text-slate-400">
                      <span className="font-medium text-slate-600">{inquilino.nome}</span>
                      {contrato && ` · ${formatMoeda(contrato.valor_mensal)}/mês`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {contrato && (
                  <span className="text-sm font-bold text-slate-800 hidden sm:block">
                    {formatMoeda(contrato.valor_mensal)}
                  </span>
                )}
                <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); abrirEditar({ imovel, inquilino, contrato }) }}>
                  <Pencil size={14} />
                </Btn>
                <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setDeleteId(imovel.id) }} className="text-red-500 hover:bg-red-50">
                  <Trash2 size={14} />
                </Btn>
                {expandido === imovel.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>
            </div>

            {expandido === imovel.id && (
              <div className="border-t border-slate-100 px-5 py-4 grid sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <User size={13} className="text-blue-500" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Inquilino</span>
                  </div>
                  {inquilino ? (
                    <div className="space-y-0.5 text-sm text-slate-700">
                      <p className="font-medium">{inquilino.nome}</p>
                      {inquilino.cpf && <p className="text-xs text-slate-500">CPF: {inquilino.cpf}</p>}
                      {inquilino.telefone && <p className="text-xs text-slate-500">{inquilino.telefone}</p>}
                      {inquilino.email && <p className="text-xs text-slate-500">{inquilino.email}</p>}
                    </div>
                  ) : <p className="text-xs text-slate-400">Sem inquilino</p>}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText size={13} className="text-green-500" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contrato</span>
                  </div>
                  {contrato ? (
                    <div className="space-y-0.5 text-sm text-slate-700">
                      <p className="text-xs text-slate-500">{formatData(contrato.data_inicio)} → {formatData(contrato.data_fim)}</p>
                      <p className="text-xs text-slate-500">Vence dia {contrato.dia_vencimento} · {contrato.indice_reajuste}</p>
                      {contrato.observacoes && <p className="text-xs text-slate-400">{contrato.observacoes}</p>}
                    </div>
                  ) : <p className="text-xs text-slate-400">Sem contrato</p>}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <CreditCard size={13} className="text-orange-500" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pagamento</span>
                  </div>
                  {contrato ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-slate-800">{formatMoeda(contrato.valor_mensal)}/mês</p>
                      {contrato.banco && <p className="text-xs text-slate-500">Banco: {contrato.banco}</p>}
                    </div>
                  ) : <p className="text-xs text-slate-400">-</p>}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Modal unificado */}
      {modal && (
        <Modal
          title={modal === 'novo' ? 'Novo Imóvel' : 'Editar Imóvel'}
          onClose={() => setModal(null)}
          size="lg"
        >
          {/* Seção imóvel */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Building2 size={13} /> Dados do Imóvel
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input label="Descrição / Nome *" value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex: Apto 102 — Bloco A" />
              </div>
              <div className="col-span-2">
                <Input label="Endereço *" value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade - UF" />
              </div>
              <Select label="Tipo" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="casa">Casa</option>
                <option value="apartamento">Apartamento</option>
                <option value="sala_comercial">Sala Comercial</option>
                <option value="outro">Outro</option>
              </Select>
              <Input label="Valor mensal (R$)" type="number" min="0" step="0.01" value={form.valor_mensal} onChange={e => set('valor_mensal', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Seção inquilino */}
          <div className="mb-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <User size={13} /> Inquilino
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input label="Nome completo" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="João da Silva" />
              </div>
              <Input label="CPF" value={form.cpf} onChange={e => set('cpf', cpfMask(e.target.value))} placeholder="000.000.000-00" />
              <Input label="Telefone" value={form.telefone} onChange={e => set('telefone', telefoneMask(e.target.value))} placeholder="(11) 99999-9999" />
              <div className="col-span-2">
                <Input label="E-mail" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
              </div>
            </div>
          </div>

          {/* Seção contrato */}
          <div className="mb-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <FileText size={13} /> Contrato
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Início do contrato" type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} />
              <Input label="Fim do contrato" type="date" value={form.data_fim} onChange={e => set('data_fim', e.target.value)} />
              <Input label="Dia de vencimento" type="number" min="1" max="31" value={form.dia_vencimento} onChange={e => set('dia_vencimento', parseInt(e.target.value) || 10)} />
              <Select label="Índice de reajuste" value={form.indice_reajuste} onChange={e => set('indice_reajuste', e.target.value)}>
                <option value="IGPM">IGP-M</option>
                <option value="IPCA">IPCA</option>
                <option value="INPC">INPC</option>
                <option value="fixo">Fixo</option>
              </Select>
              <div className="col-span-2">
                <Input label="Banco para pagamento" value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Ex: Santander, Caixa, Nubank..." />
              </div>
              <div className="col-span-2">
                <Textarea label="Observações" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={!form.descricao.trim() || !form.endereco.trim()}>Salvar</Btn>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-slate-700 mb-2">Isso vai excluir o imóvel e o contrato vinculado.</p>
          <p className="text-sm text-slate-500 mb-5">O inquilino só será removido se não tiver outros contratos.</p>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={excluirImovel}>Excluir</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
