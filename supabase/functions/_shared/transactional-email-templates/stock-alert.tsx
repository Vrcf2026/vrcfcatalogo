import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  productName?: string
  productUrl?:  string
}

const StockAlertEmail = ({
  productName = '',
  productUrl  = '',
}: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>✅ {productName} voltou a ter stock — VRCF</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ Produto disponível</Heading>
        <Text style={text}>
          Boas notícias! O produto que seguias voltou a estar disponível:
        </Text>
        <Text style={productBox}>{productName}</Text>
        {productUrl ? (
          <Text style={text}>
            <Link href={productUrl} style={link}>Ver produto e pedir orçamento →</Link>
          </Text>
        ) : null}
        <Text style={text}>
          Aproveita enquanto há stock — a disponibilidade pode ser limitada.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>VRCF - VALTER ROBERTO CRUZ FRANCISCO UNI. LDA</Text>
        <Text style={footer}>📞 +351 911 564 243 · ✉️ geral@vrcf.pt</Text>
        <Text style={footer}>📍 Rua Luis Calado Nunes 15 LJB, 2870-350 Montijo</Text>
        <Text style={footer}>Recebeste este email porque pediste para ser avisado sobre a disponibilidade deste produto.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StockAlertEmail,
  subject: (d: Record<string, any>) => `✅ ${(d?.productName || 'Produto').toString()} voltou a ter stock — VRCF`,
  displayName: 'Alerta de stock disponível',
  previewData: {
    productName: 'Câmara IP Hikvision DS-2CD2143G2-I 4MP',
    productUrl:  'https://showroom.vrcf.info/produto/camara-ip-hikvision',
  },
} satisfies TemplateEntry

const main       = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container  = { padding: '24px', maxWidth: '600px' }
const h1         = { fontSize: '22px', color: '#1a1a2e', borderBottom: '2px solid #16a34a', paddingBottom: '10px', margin: '0 0 20px' }
const text       = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 12px' }
const productBox = { fontSize: '15px', fontWeight: 'bold', color: '#1a1a2e', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '12px 16px', margin: '0 0 16px' }
const link       = { color: '#f97316', fontWeight: 'bold' }
const hr         = { borderColor: '#eee', margin: '20px 0' }
const footer     = { fontSize: '11px', color: '#999', margin: '4px 0' }
