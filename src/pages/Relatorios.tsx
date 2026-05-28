import { useState, useMemo } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Card, Btn, PageHeader, Badge } from '../components/ui'
import { pagamentosDB, contratosDB, inquilinosDB } from '../lib/storage'
import { exportarDados, importarDados } from '../lib/storage'
import { formatMoeda, formatData } from '../lib/utils'
import * as XLSX from 'xlsx'

export default function Relatorios() {
  const [mes, setMes] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const resumo = useMemo(() => {
    const pagamentos = pagamentosDB.list().filter(p => p.mes_referencia === mes)
    const pago = pagamentos.filter(p => p.status === 'pago')
    const pendente = pagamentos.filter(p => p.status === 'pendente')
    const atrasado = pagamentos.filter(p => p.status === 'atrasado')
    const contratos = contratosDB.list().filter(c => c.status === 'ativo')
    return {
      pagamentos,
      totalPago: pago.reduce((s, p) => s + p.valor, 0),
      totalPendente: pendente.reduce((s, p) => s + p.valor, 0),
      totalAtrasado: atrasado.reduce((s, p) => s + p.valor, 0),
      qtdPago: pago.length,
      qtdPendente: pendente.length,
      qtdAtrasado: atrasado.length,
      totalContratos: contratos.length,
      totalEsperado: contratos.reduce((s, c) => s + c.valor_mensal, 0),
    }
  }, [mes])

  function exportarExcel() {
    const rows = resumo.pagamentos.map(p => ({
      'Inquilino': p.contrato?.inquilino?.nome ?? '-',
      'Imóvel': p.contrato?.imovel?.descricao ?? '-',
      'Endereço': p.contrato?.imovel?.endereco ?? '-',
      'Mês': p.mes_referencia,
      'Valor (R$)': p.valor,
      'Vencimento': formatData(p.data_vencimento),
      'Pagamento': formatData(p.data_pagamento),
      'Status': p.status === 'pago' ? 'Pago' : p.status === 'atrasado' ? 'Atrasado' : 'Pendente',
      'Observações': p.observacoes,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Pagamentos ${mes}`)
    XLSX.writeFile(wb, `relatorio-alugueis-${mes}.xlsx`)
  }

  function exportarTodosExcel() {
    const contratos = contratosDB.list()
    const inquilinos = inquilinosDB.list()
    const pagamentos = pagamentosDB.list()

    const wsContratos = XLSX.utils.json_to_sheet(contratos.map(c => ({
      'Inquilino': c.inquilino?.nome ?? '-',
      'Imóvel': c.imovel?.descricao ?? '-',
      'Endereço': c.imovel?.endereco ?? '-',
      'Início': formatData(c.data_inicio),
      'Fim': formatData(c.data_fim),
      'Valor (R$)': c.valor_mensal,
      'Dia Vencimento': c.dia_vencimento,
      'Reajuste': c.indice_reajuste,
      'Status': c.status,
    })))

    const wsInquilinos = XLSX.utils.json_to_sheet(inquilinos.map(i => ({
      'Nome': i.nome, 'CPF': i.cpf, 'RG': i.rg,
      'Telefone': i.telefone, 'E-mail': i.email,
      'Endereço anterior': i.endereco_anterior,
    })))

    const wsPagamentos = XLSX.utils.json_to_sheet(pagamentos.map(p => ({
      'Inquilino': p.contrato?.inquilino?.nome ?? '-',
      'Imóvel': p.contrato?.imovel?.descricao ?? '-',
      'Mês': p.mes_referencia,
      'Valor (R$)': p.valor,
      'Vencimento': formatData(p.data_vencimento),
      'Pagamento': formatData(p.data_pagamento),
      'Status': p.status,
    })))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsInquilinos, 'Inquilinos')
    XLSX.utils.book_append_sheet(wb, wsContratos, 'Contratos')
    XLSX.utils.book_append_sheet(wb, wsPagamentos, 'Pagamentos')
    XLSX.writeFile(wb, `relatorio-completo-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function backupJSON() {
    const data = exportarDados()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `backup-alugueis-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  function restaurarJSON() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        try {
          importarDados(ev.target?.result as string)
          alert('Dados importados com sucesso! Recarregue a página.')
        } catch {
          alert('Erro ao importar: arquivo inválido.')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const STATUS_COLOR: Record<string, 'green' | 'yellow' | 'red'> = {
    pago: 'green', pendente: 'yellow', atrasado: 'red',
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" subtitle="Visualize e exporte dados do sistema" />

      {/* Filtro de mês */}
      <Card className="p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Mês de referência:</label>
            <input
              type="month"
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Btn variant="secondary" onClick={exportarExcel}>
            <FileSpreadsheet size={16} /> Exportar mês (Excel)
          </Btn>
          <Btn variant="secondary" onClick={exportarTodosExcel}>
            <FileSpreadsheet size={16} /> Relatório completo
          </Btn>
        </div>
      </Card>

      {/* Resumo do mês */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500">Total esperado</p>
          <p className="font-bold text-slate-900 text-lg">{formatMoeda(resumo.totalEsperado)}</p>
          <p className="text-xs text-slate-400">{resumo.totalContratos} contrato(s)</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500">Recebido</p>
          <p className="font-bold text-green-600 text-lg">{formatMoeda(resumo.totalPago)}</p>
          <p className="text-xs text-slate-400">{resumo.qtdPago} pagamento(s)</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500">Pendente</p>
          <p className="font-bold text-yellow-600 text-lg">{formatMoeda(resumo.totalPendente)}</p>
          <p className="text-xs text-slate-400">{resumo.qtdPendente} pagamento(s)</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500">Atrasado</p>
          <p className="font-bold text-red-600 text-lg">{formatMoeda(resumo.totalAtrasado)}</p>
          <p className="text-xs text-slate-400">{resumo.qtdAtrasado} pagamento(s)</p>
        </Card>
      </div>

      {/* Tabela de pagamentos do mês */}
      <Card>
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">Pagamentos — {mes}</h2>
        </div>
        {resumo.pagamentos.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">Nenhum pagamento para este mês</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-left px-5 py-3">Inquilino</th>
                  <th className="text-left px-5 py-3">Imóvel</th>
                  <th className="text-right px-5 py-3">Valor</th>
                  <th className="text-left px-5 py-3">Vencimento</th>
                  <th className="text-left px-5 py-3">Pagamento</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumo.pagamentos.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{p.contrato?.inquilino?.nome ?? '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{p.contrato?.imovel?.descricao ?? '-'}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatMoeda(p.valor)}</td>
                    <td className="px-5 py-3 text-slate-600">{formatData(p.data_vencimento)}</td>
                    <td className="px-5 py-3 text-slate-600">{formatData(p.data_pagamento)}</td>
                    <td className="px-5 py-3"><Badge variant={STATUS_COLOR[p.status]}>{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Backup */}
      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 text-sm mb-3">Backup dos Dados</h2>
        <p className="text-sm text-slate-500 mb-4">
          Exporte todos os dados em formato JSON para guardar uma cópia de segurança ou transferir entre dispositivos.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Btn variant="secondary" onClick={backupJSON}>
            <Download size={16} /> Exportar backup (JSON)
          </Btn>
          <Btn variant="secondary" onClick={restaurarJSON}>
            Importar backup
          </Btn>
        </div>
      </Card>
    </div>
  )
}
