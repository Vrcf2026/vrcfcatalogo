import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  customerEmail?: string
  quoteNumber?: string
  decisionLabel?: string
  decision?: 'accepted' | 'rejected' | string
  notes?: string
}

const CustomerDecisionGestorEmail = ({
  customerName = '',
  customerEmail = '',
  quoteNumber = '',
  decisionLabel = 'Atualizado',
  decision = '',
  notes = '',
}: Props) => {
  const isAccepted = decision === 'accepted'
  const color = isAccepted ? '#16a34a' : '#dc2626'
  const icon = isAccepted ? '✅' : '❌'
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>Cliente {decisionLabel.toLowerCase()} o orçamento {quoteNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{icon} Decisão do Cliente - Orçamento {quoteNumber}</Heading>
          <Text style={text}>
            O cliente <strong>{customerName || 'sem nome'}</strong>
            {customerEmail ? <> ({customerEmail})</> : null} tomou uma decisão sobre o orçamento <strong>{quoteNumber}</strong>.
          </Text>
          <Section style={badgeBox}>
            <Text style={{ ...badge, background: color }}>{decisionLabel}</Text>
          </Section>
          {notes ? (
            <>
              <Heading as="h3" style={h3}>Notas do cliente</Heading>
              <Text style={text}>{notes}</Text>
            </>
          ) : null}
          <Hr style={hr} />
          <Text style={text}>
            Aceda ao painel de gestão para acompanhar o pedido.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>VRCF - VALTER ROBERTO CRUZ FRANCISCO UNI. LDA</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CustomerDecisionGestorEmail,
  subject: (d: Record<string, any>) => {
    const action = (d?.decision === 'accepted') ? 'aceitou' : (d?.decision === 'rejected' ? 'rejeitou' : 'atualizou')
    return `Cliente ${action} orçamento ${(d?.quoteNumber || '').toString()} - VRCF`
  },
  displayName: 'Decisão do cliente sobre orçamento (gestor)',
  previewData: {
    customerName: 'João Silva',
    customerEmail: 'joao@example.com',
    quoteNumber: 'ORC-2026-0042',
    decisionLabel: 'Aceite',
    decision: 'accepted',
    notes: '',
  },
} satisfies TemplateEntry

const main  = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '20px', color: '#1a1a2e', borderBottom: '2px solid #f97316', paddingBottom: '10px', margin: '0 0 20px' }
const h3 = { fontSize: '15px', color: '#1a1a2e', margin: '20px 0 8px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 12px' }
const badgeBox = { textAlign: 'center' as const, margin: '20px 0' }
const badge = { display: 'inline-block', padding: '8px 20px', borderRadius: '20px', color: '#fff', fontWeight: 'bold', fontSize: '14px', margin: '0' }
const hr = { borderColor: '#eee', margin: '20px 0' }
const footer = { fontSize: '11px', color: '#999', margin: '4px 0' }
