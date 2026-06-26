import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?:    string
  customerEmail?:   string
  quoteNumber?:     string
  statusLabel?:     string
  rejectionReason?: string
}

const QuoteCustomerDecisionEmail = ({
  customerName    = '',
  customerEmail   = '',
  quoteNumber     = '',
  statusLabel     = '',
  rejectionReason = '',
}: Props) => {
  const accepted = statusLabel === 'Aceite'
  const emoji    = accepted ? '✅' : '❌'
  const color    = accepted ? '#16a34a' : '#dc2626'

  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>{emoji} Cliente {statusLabel.toLowerCase()} o orçamento {quoteNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{emoji} Decisão do Cliente — Orçamento {quoteNumber}</Heading>

          <Section style={{ ...badgeBox, borderLeft: `4px solid ${color}`, paddingLeft: '12px' }}>
            <Text style={{ ...text, fontWeight: 'bold', color, margin: 0 }}>
              {customerName || 'O cliente'} {accepted ? 'aceitou' : 'rejeitou'} o orçamento.
            </Text>
          </Section>

          <Text style={text}>
            <strong>Cliente:</strong> {customerName}<br />
            <strong>Email:</strong> {customerEmail}<br />
            <strong>Orçamento:</strong> {quoteNumber}<br />
            <strong>Decisão:</strong> {statusLabel}
          </Text>

          {!accepted && rejectionReason ? (
            <>
              <Heading as="h3" style={h3}>Motivo da rejeição</Heading>
              <Section style={reasonBox}>
                <Text style={{ ...text, margin: 0 }}>{rejectionReason}</Text>
              </Section>
            </>
          ) : null}

          {accepted ? (
            <Text style={text}>
              Podes agora preparar a encomenda e entrar em contacto com o cliente para confirmar os detalhes de entrega.
            </Text>
          ) : (
            <Text style={text}>
              Podes contactar o cliente para perceber se existe forma de chegar a acordo.
            </Text>
          )}

          <Hr style={hr} />
          <Text style={footer}>VRCF — Sistema de Orçamentos</Text>
          <Text style={footer}>Esta notificação foi gerada automaticamente.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: QuoteCustomerDecisionEmail,
  subject: (d: Record<string, any>) =>
    `${d?.statusLabel === 'Aceite' ? '✅' : '❌'} Cliente ${(d?.statusLabel || '').toString().toLowerCase()} o orçamento ${(d?.quoteNumber || '').toString()} — VRCF`,
  displayName: 'Decisão do cliente (aceitar/rejeitar orçamento)',
  previewData: {
    customerName:    'João Silva',
    customerEmail:   'joao@empresa.pt',
    quoteNumber:     'ORC-2026-0042',
    statusLabel:     'Rejeitado',
    rejectionReason: 'Preço acima do orçamento disponível.',
  },
} satisfies TemplateEntry

const main      = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1        = { fontSize: '20px', color: '#1a1a2e', borderBottom: '2px solid #f97316', paddingBottom: '10px', margin: '0 0 20px' }
const h3        = { fontSize: '14px', color: '#1a1a2e', margin: '16px 0 6px' }
const text      = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 12px' }
const badgeBox  = { background: '#f9fafb', borderRadius: '6px', padding: '12px', margin: '0 0 20px' }
const reasonBox = { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', margin: '0 0 16px' }
const hr        = { borderColor: '#eee', margin: '20px 0' }
const footer    = { fontSize: '11px', color: '#999', margin: '4px 0' }
