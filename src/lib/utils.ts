import { format, parseISO, isAfter, isBefore, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function formatData(data: string | null): string {
  if (!data) return '-'
  try {
    return format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return data
  }
}

export function formatMesAno(data: string): string {
  try {
    return format(parseISO(data + '-01'), 'MMMM/yyyy', { locale: ptBR })
  } catch {
    return data
  }
}

export function mesAtual(): string {
  return format(new Date(), 'yyyy-MM')
}

export function statusPagamento(vencimento: string, pago: boolean): 'pago' | 'pendente' | 'atrasado' {
  if (pago) return 'pago'
  const hoje = new Date()
  const dataVenc = parseISO(vencimento)
  return isAfter(hoje, dataVenc) ? 'atrasado' : 'pendente'
}

export function diasAtraso(vencimento: string): number {
  const hoje = new Date()
  const dataVenc = parseISO(vencimento)
  if (isBefore(dataVenc, hoje)) return differenceInDays(hoje, dataVenc)
  return 0
}

export function contratoVencendoEm(dataFim: string, dias = 30): boolean {
  const hoje = new Date()
  const fim = parseISO(dataFim)
  const diff = differenceInDays(fim, hoje)
  return diff >= 0 && diff <= dias
}

export function contratoVencido(dataFim: string): boolean {
  return isBefore(parseISO(dataFim), new Date())
}

export function cpfMask(v: string): string {
  return v
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

export function telefoneMask(v: string): string {
  return v
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{4})$/, '$1-$2')
    .slice(0, 15)
}

export const TIPO_IMOVEL_LABEL: Record<string, string> = {
  casa: 'Casa',
  apartamento: 'Apartamento',
  sala_comercial: 'Sala Comercial',
  outro: 'Outro',
}

export const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo',
  encerrado: 'Encerrado',
  rescindido: 'Rescindido',
}

export const STATUS_PAG_LABEL: Record<string, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
}
