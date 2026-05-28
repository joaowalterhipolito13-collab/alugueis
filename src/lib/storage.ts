// Fallback localStorage storage when Supabase is not configured
import type { Inquilino, Imovel, Contrato, Pagamento } from './supabase'

const KEYS = {
  inquilinos: 'alug_inquilinos',
  imoveis: 'alug_imoveis',
  contratos: 'alug_contratos',
  pagamentos: 'alug_pagamentos',
}

function get<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function set<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

// --- Inquilinos ---
export const inquilinosDB = {
  list: (): Inquilino[] => get(KEYS.inquilinos),
  get: (id: string) => get<Inquilino>(KEYS.inquilinos).find(i => i.id === id),
  create: (data: Omit<Inquilino, 'id' | 'criado_em'>): Inquilino => {
    const all = get<Inquilino>(KEYS.inquilinos)
    const novo = { ...data, id: uuid(), criado_em: new Date().toISOString() } as Inquilino
    set(KEYS.inquilinos, [...all, novo])
    return novo
  },
  update: (id: string, data: Partial<Inquilino>): Inquilino | null => {
    const all = get<Inquilino>(KEYS.inquilinos)
    const idx = all.findIndex(i => i.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...data }
    set(KEYS.inquilinos, all)
    return all[idx]
  },
  delete: (id: string) => {
    set(KEYS.inquilinos, get<Inquilino>(KEYS.inquilinos).filter(i => i.id !== id))
  },
}

// --- Imóveis ---
export const imoveisDB = {
  list: (): Imovel[] => get(KEYS.imoveis),
  get: (id: string) => get<Imovel>(KEYS.imoveis).find(i => i.id === id),
  create: (data: Omit<Imovel, 'id' | 'criado_em'>): Imovel => {
    const all = get<Imovel>(KEYS.imoveis)
    const novo = { ...data, id: uuid(), criado_em: new Date().toISOString() } as Imovel
    set(KEYS.imoveis, [...all, novo])
    return novo
  },
  update: (id: string, data: Partial<Imovel>): Imovel | null => {
    const all = get<Imovel>(KEYS.imoveis)
    const idx = all.findIndex(i => i.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...data }
    set(KEYS.imoveis, all)
    return all[idx]
  },
  delete: (id: string) => {
    set(KEYS.imoveis, get<Imovel>(KEYS.imoveis).filter(i => i.id !== id))
  },
}

// --- Contratos ---
export const contratosDB = {
  list: (): Contrato[] => {
    const contratos = get<Contrato>(KEYS.contratos)
    const inquilinos = get<Inquilino>(KEYS.inquilinos)
    const imoveis = get<Imovel>(KEYS.imoveis)
    return contratos.map(c => ({
      ...c,
      inquilino: inquilinos.find(i => i.id === c.inquilino_id),
      imovel: imoveis.find(i => i.id === c.imovel_id),
    }))
  },
  get: (id: string) => contratosDB.list().find(c => c.id === id),
  create: (data: Omit<Contrato, 'id' | 'criado_em' | 'inquilino' | 'imovel'> & { banco?: string }): Contrato => {
    const all = get<Contrato>(KEYS.contratos)
    const novo = { ...data, id: uuid(), criado_em: new Date().toISOString() } as Contrato
    set(KEYS.contratos, [...all, novo])
    return novo
  },
  update: (id: string, data: Partial<Contrato>): Contrato | null => {
    const all = get<Contrato>(KEYS.contratos)
    const idx = all.findIndex(c => c.id === id)
    if (idx === -1) return null
    const { inquilino: _, imovel: __, ...rest } = data
    all[idx] = { ...all[idx], ...rest }
    set(KEYS.contratos, all)
    return all[idx]
  },
  delete: (id: string) => {
    set(KEYS.contratos, get<Contrato>(KEYS.contratos).filter(c => c.id !== id))
  },
}

// --- Pagamentos ---
export const pagamentosDB = {
  list: (): Pagamento[] => {
    const pagamentos = get<Pagamento>(KEYS.pagamentos)
    const contratos = contratosDB.list()
    return pagamentos.map(p => ({
      ...p,
      contrato: contratos.find(c => c.id === p.contrato_id),
    }))
  },
  listByContrato: (contratoId: string): Pagamento[] =>
    pagamentosDB.list().filter(p => p.contrato_id === contratoId),
  create: (data: Omit<Pagamento, 'id' | 'criado_em' | 'contrato'>): Pagamento => {
    const all = get<Pagamento>(KEYS.pagamentos)
    const novo = { ...data, id: uuid(), criado_em: new Date().toISOString() } as Pagamento
    set(KEYS.pagamentos, [...all, novo])
    return novo
  },
  update: (id: string, data: Partial<Pagamento>): Pagamento | null => {
    const all = get<Pagamento>(KEYS.pagamentos)
    const idx = all.findIndex(p => p.id === id)
    if (idx === -1) return null
    const { contrato: _, ...rest } = data
    all[idx] = { ...all[idx], ...rest }
    set(KEYS.pagamentos, all)
    return all[idx]
  },
  delete: (id: string) => {
    set(KEYS.pagamentos, get<Pagamento>(KEYS.pagamentos).filter(p => p.id !== id))
  },
}

// Gera cobranças mensais automaticamente para todos os contratos ativos
export function gerarCobrancasAutomaticas() {
  const hoje = new Date()
  const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const contratos = get<Contrato>(KEYS.contratos).filter(c => c.status === 'ativo')
  const pagamentosExistentes = get<Pagamento>(KEYS.pagamentos)
    .filter(p => p.mes_referencia === mes)
    .map(p => p.contrato_id)

  for (const c of contratos) {
    if (pagamentosExistentes.includes(c.id)) continue
    const [ano, m] = mes.split('-').map(Number)
    const dia = c.dia_vencimento ?? 10
    const vencimento = `${ano}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    const nova: Pagamento = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      contrato_id: c.id,
      mes_referencia: mes,
      valor: c.valor_mensal,
      data_vencimento: vencimento,
      data_pagamento: null,
      status: 'pendente',
      observacoes: '',
      criado_em: new Date().toISOString(),
    }
    const todas = get<Pagamento>(KEYS.pagamentos)
    set(KEYS.pagamentos, [...todas, nova])
  }
}

export function exportarDados() {
  return {
    inquilinos: get<Inquilino>(KEYS.inquilinos),
    imoveis: get<Imovel>(KEYS.imoveis),
    contratos: get<Contrato>(KEYS.contratos),
    pagamentos: get<Pagamento>(KEYS.pagamentos),
    exportado_em: new Date().toISOString(),
  }
}

export function importarDados(json: string) {
  const data = JSON.parse(json)
  if (data.inquilinos) set(KEYS.inquilinos, data.inquilinos)
  if (data.imoveis) set(KEYS.imoveis, data.imoveis)
  if (data.contratos) set(KEYS.contratos, data.contratos)
  if (data.pagamentos) set(KEYS.pagamentos, data.pagamentos)
}
