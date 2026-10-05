import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Item {
  quoteNumber: string
  customerName: string
  total: number | null
  days: number
  url: string
}

interface Props {
  pending?: Item[]
  noAnswer?: Item[]
  unpaid?: Item[]
}

const fmt = (v: number | null) =>
  v != null ? `${Number(v).toFixed(2).replace('.', ',')} €` : '—'

const Group = ({ title, hint, items }: { title: string; hint: string; items: Item[] }) =>
  items.length === 0 ? null : (
    <Section style={group}>
      <Text style={groupTitle}>{title} ({items.length})</Text>
      <Text style={groupHint}>{hint}</Text>
      {items.map((i) => (
        <Text key={i.quoteNumber} style={row}>
          <Link href={i.url} style={link}>{i.quoteNumber}</Link> · {i.customerName || 'Sem nome'} · {fmt(i.total)} · há {i.days} dias
        </Text>
      ))}
    </Section>
  )

const DigestEmail = ({ pending = [], noAnswer = [], unpaid = [] }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Orçamentos que precisam de seguimento — VRCF</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Orçamentos para seguimento</Heading>
        <Group title="Pedidos por tratar" hint="Clientes à espera de orçamento há mais de 2 dias." items={pending} />
        <Group title="Enviados sem resposta" hint="Já receberam lembrete automático. Vale a pena um telefonema." items={noAnswer} />
        <Group title="Aceites e por pagar" hint="Aceites há mais de 3 dias sem pagamento registado." items={unpaid} />
        <Hr style={hr} />
        <Text style={footer}>Resumo automático diário do catálogo VRCF. Só é enviado quando há algo pendente.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DigestEmail,
  subject: (d: Record<string, any>) => {
    const n = (d?.pending?.length ?? 0) + (d?.noAnswer?.length ?? 0) + (d?.unpaid?.length ?? 0)
    return `${n} orçamento${n === 1 ? '' : 's'} para seguimento — VRCF`
  },
  displayName: 'Resumo diário de seguimento (gestão)',
  previewData: {
    pending: [{ quoteNumber: 'ORC-2026-0150', customerName: 'Câmara Municipal', total: 890, days: 3, url: 'https://catalogo.vrcf.pt/gestao/orcamentos' }],
    noAnswer: [{ quoteNumber: 'ORC-2026-0142', customerName: 'João Silva', total: 1249.9, days: 9, url: 'https://catalogo.vrcf.pt/gestao/orcamentos' }],
    unpaid: [],
  },
} satisfies TemplateEntry

const main       = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container  = { padding: '24px', maxWidth: '600px' }
const h1         = { fontSize: '22px', color: '#1a1a2e', borderBottom: '2px solid #f97316', paddingBottom: '10px', margin: '0 0 20px' }
const group      = { margin: '0 0 20px' }
const groupTitle = { fontSize: '15px', fontWeight: 'bold', color: '#1a1a2e', margin: '0 0 2px' }
const groupHint  = { fontSize: '12px', color: '#777', margin: '0 0 8px' }
const row        = { fontSize: '14px', color: '#333', margin: '0 0 4px' }
const link       = { color: '#f97316', fontWeight: 'bold' }
const hr         = { borderColor: '#eee', margin: '20px 0' }
const footer     = { fontSize: '11px', color: '#999', margin: '4px 0' }
