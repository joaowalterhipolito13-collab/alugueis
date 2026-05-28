import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Database = {
  inquilinos: Inquilino[]
  imoveis: Imovel[]
  contratos: Contrato[]
  pagamentos: Pagamento[]
}

export interface Inquilino {
  id: string
  nome: string
  cpf: string
  rg: string
  telefone: string
  email: string
  endereco_anterior: string
  criado_em: string
}

export interface Imovel {
  id: string
  descricao: string
  endereco: string
  tipo: 'casa' | 'apartamento' | 'sala_comercial' | 'outro'
  valor_base: number
  criado_em: string
}

export interface Contrato {
  id: string
  inquilino_id: string
  imovel_id: string
  data_inicio: string
  data_fim: string
  valor_mensal: number
  dia_vencimento: number
  indice_reajuste: 'IGPM' | 'IPCA' | 'INPC' | 'fixo'
  status: 'ativo' | 'encerrado' | 'rescindido'
  banco: string
  observacoes: string
  criado_em: string
  inquilino?: Inquilino
  imovel?: Imovel
}

export interface Pagamento {
  id: string
  contrato_id: string
  mes_referencia: string
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  status: 'pago' | 'pendente' | 'atrasado'
  observacoes: string
  criado_em: string
  contrato?: Contrato
}
