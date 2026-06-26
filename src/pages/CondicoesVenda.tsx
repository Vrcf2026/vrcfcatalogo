import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import vrcfLogo from "@/assets/vrcf-logo.png";

const CondicoesVenda = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={vrcfLogo} alt="VRCF Logo" className="h-16 w-auto drop-shadow-md" />
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Condições Gerais de Venda
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Versão em vigor a partir de: 15/06/2026
          </p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              1. Identificação do Vendedor
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              As presentes Condições Gerais de Venda (doravante "CGV") regulam as relações comerciais
              entre{" "}
              <strong className="text-foreground">VALTER ROBERTO CRUZ FRANCISCO UNI. LDA</strong>, NIF{" "}
              <strong className="text-foreground">515237205</strong>, com sede em{" "}
              <strong className="text-foreground">R. Luis Calado Nunes 15 LJ B, Montijo</strong>, a operar
              sob a marca comercial <strong className="text-foreground">VRCF – Informática & Segurança</strong>{" "}
              (doravante "VRCF"), e os seus clientes, sejam estes consumidores particulares (B2C) ou
              empresas e profissionais (B2B).
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Contacto comercial:{" "}
              <a href="mailto:geral@vrcf.pt" className="text-primary hover:underline">geral@vrcf.pt</a>{" "}
              ·{" "}
              <a href="tel:+351911564243" className="text-primary hover:underline">+351 911 564 243</a>
              {" "}(chamada para a rede móvel nacional)
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              2. Âmbito e Aceitação
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              As presentes CGV aplicam-se a todas as vendas de produtos e serviços realizadas pela VRCF,
              incluindo as decorrentes de pedidos de orçamento submetidos através do catálogo online em{" "}
              <a href="https://showroom.vrcf.info" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                showroom.vrcf.info
              </a>.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              O catálogo apresenta produtos e preços a título indicativo. A venda só se concretiza após
              emissão de proposta formal pela VRCF e aceitação expressa pelo cliente. A aceitação do
              orçamento implica a aceitação integral das presentes CGV.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              As CGV aplicáveis são as que estiverem em vigor na data da aceitação do orçamento.
              A VRCF reserva-se o direito de as atualizar, sendo sempre publicada nesta página a versão
              atual com a respetiva data de entrada em vigor.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              3. Preços e Orçamentos
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Os preços apresentados no catálogo são{" "}
              <strong className="text-foreground">indicativos e sem IVA</strong>, salvo indicação
              em contrário. O preço definitivo, incluindo IVA à taxa legal em vigor e custos de
              transporte, consta do orçamento formal emitido pela VRCF.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Os preços podem ser alterados sem aviso prévio, nomeadamente por flutuações de mercado
              ou de fornecedores. O orçamento emitido tem validade de{" "}
              <strong className="text-foreground">30 dias</strong> a contar da data de emissão, salvo
              indicação diferente no próprio documento.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              As imagens apresentadas no catálogo são meramente ilustrativas e não constituem
              compromisso contratual quanto a cor, design ou acessórios incluídos.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              4. Formalização do Contrato
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              O pedido de orçamento não constitui uma encomenda vinculativa. O contrato de compra e
              venda considera-se celebrado apenas quando:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>A VRCF emitir proposta formal (orçamento) ao cliente; e</li>
              <li>O cliente aceitar expressamente a proposta, por escrito ou por email; e</li>
              <li>O pagamento antecipado for confirmado pela VRCF.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">Produtos sob encomenda especial</strong> — produtos
              não existentes em stock, importados ou configurados a pedido — requerem confirmação de
              disponibilidade e prazo antes da emissão de proposta. Uma vez aceite o orçamento e
              efetuado o pagamento, estes produtos não podem ser cancelados nem devolvidos, salvo
              defeito de fabrico.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              5. Pagamento
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              O pagamento é <strong className="text-foreground">antecipado e obrigatório</strong> antes
              do processamento da encomenda. São aceites os seguintes meios de pagamento:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Transferência bancária (IBAN comunicado na proposta);</li>
              <li>Referência Multibanco;</li>
              <li>MB Way.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Após efetuar o pagamento, o cliente deve enviar o comprovativo para{" "}
              <a href="mailto:geral@vrcf.pt" className="text-primary hover:underline">geral@vrcf.pt</a>,
              indicando o número do orçamento. O processamento inicia-se apenas após confirmação da
              receção do pagamento. Em caso de pagamento fora do prazo indicado na proposta, a VRCF
              reserva-se o direito de rever os preços ou cancelar a proposta.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              6. Transporte e Entrega
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">Âmbito geográfico:</strong> A VRCF realiza entregas
              em Portugal Continental, Açores e Madeira.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">Custos de transporte:</strong> Os valores de porte
              eventualmente apresentados no catálogo ou no carrinho de orçamento são{" "}
              <strong className="text-foreground">sempre estimativas indicativas</strong>. O custo
              definitivo de transporte, a transportadora e o prazo de entrega serão confirmados no
              orçamento formal, podendo variar em função do peso, volume, destino e tipo de produto.
              Entregas para as ilhas, produtos volumosos ou paletizados estão sempre sujeitos a
              cálculo individual.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">Prazos de entrega:</strong> Os prazos são indicativos
              e contam-se a partir da confirmação do pagamento. A VRCF não se responsabiliza por atrasos
              imputáveis a transportadoras ou a circunstâncias de força maior.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">Conferência na entrega:</strong> O cliente deve, no
              momento da receção, confirmar o número de volumes, verificar o estado das embalagens e,
              em caso de danos visíveis (rasgos, amolgadelas, fita violada), registar obrigatoriamente
              a ocorrência na guia do transportador no ato da entrega e comunicar à VRCF no prazo de{" "}
              <strong className="text-foreground">48 horas</strong>. Reclamações sem registo na guia
              ou comunicadas após esse prazo não poderão ser aceites.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              7. Direito de Livre Resolução — Consumidores Particulares (B2C)
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Nos termos do Decreto-Lei n.º 24/2014, de 14 de fevereiro, o consumidor particular
              (pessoa singular que adquire para uso não profissional) tem o direito de resolver o
              contrato no prazo de{" "}
              <strong className="text-foreground">14 dias de calendário</strong> a contar da data
              de receção física do bem, sem necessidade de justificação.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">
              7.1 Como exercer o direito
            </h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              O consumidor deve comunicar a decisão à VRCF por declaração inequívoca (email para{" "}
              <a href="mailto:geral@vrcf.pt" className="text-primary hover:underline">geral@vrcf.pt</a>)
              dentro dos 14 dias. Pode utilizar o formulário de livre resolução anexo ao DL 24/2014,
              mas tal não é obrigatório. Após a comunicação, dispõe de{" "}
              <strong className="text-foreground">14 dias</strong> para devolver o produto.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">
              7.2 Condições de devolução
            </h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              O produto deve ser devolvido em perfeito estado, na embalagem original, com todos os
              acessórios, manuais, selos e lacres intactos. Produtos que apresentem sinais de utilização
              para além do necessário para verificar a sua natureza e funcionamento podem ser objeto de
              dedução proporcional no reembolso.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">
              7.3 Reembolso
            </h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              A VRCF reembolsará o consumidor de{" "}
              <strong className="text-foreground">todos os pagamentos efetuados, incluindo os
              custos de entrega standard</strong> (exceto custos suplementares resultantes da escolha
              de modalidade de envio mais onerosa), no prazo máximo de{" "}
              <strong className="text-foreground">14 dias</strong> a contar da receção do bem
              devolvido ou da prova de envio, o que ocorrer primeiro, e pelo mesmo meio de pagamento
              utilizado na compra.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Os <strong className="text-foreground">custos de transporte de devolução</strong> são
              da responsabilidade do consumidor, conforme aqui expressamente informado (art. 13.º
              do DL 24/2014). Se o incumprimento da obrigação de reembolso ocorrer fora do prazo,
              a VRCF fica obrigada a devolver em dobro o montante pago, nos termos legais.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">
              7.4 Exceções ao direito de livre resolução
            </h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Nos termos do art. 17.º do DL 24/2014, o direito de livre resolução não se aplica a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Produtos fabricados segundo especificações do consumidor ou manifestamente personalizados;</li>
              <li>Produtos selados que não possam ser devolvidos por razões de proteção da saúde ou higiene, quando abertos após a entrega (ex.: consumíveis, software);</li>
              <li>Produtos sob encomenda especial, uma vez confirmado o pagamento;</li>
              <li>Produtos que, pela sua natureza, se deteriorem ou fiquem fora de prazo rapidamente.</li>
            </ul>

            <p className="text-muted-foreground leading-relaxed mt-3 text-xs italic">
              Nota: Os clientes empresariais (B2B) não beneficiam do direito de livre resolução legal.
              As devoluções B2B estão reguladas na secção 8.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              8. Devoluções — Clientes Empresariais (B2B)
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A VRCF aceita devoluções de clientes empresariais nas seguintes condições:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Solicitadas no prazo de <strong className="text-foreground">14 dias</strong> após a receção;</li>
              <li>Produto em estado original, embalagem original intacta, com todos os acessórios e documentação;</li>
              <li>Acompanhadas da fatura de compra e sujeitas a aprovação prévia pela VRCF;</li>
              <li>Custos de transporte de retorno a cargo do cliente.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Não são aceites devoluções de produtos sob encomenda especial ou com embalagem
              original aberta/danificada. Aprovada a devolução, será emitida nota de crédito
              ou efetuada troca, conforme acordado.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              9. Garantias
            </h2>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">
              9.1 Clientes Particulares (B2C) — DL 84/2021
            </h3>
            <div className="mt-3 rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left p-3 font-semibold text-foreground">Tipo de produto</th>
                    <th className="text-left p-3 font-semibold text-foreground">Prazo de garantia legal</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t border-border">
                    <td className="p-3">Produtos novos</td>
                    <td className="p-3 font-semibold text-foreground">3 anos</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">Produtos recondicionados (indicado na fatura)</td>
                    <td className="p-3 font-semibold text-foreground">18 meses *</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground text-xs mt-2 italic">
              * Prazo reduzido por acordo entre as partes, nos termos do art. 10.º do DL 84/2021,
              aplicável a bens usados/recondicionados vendidos por profissionais.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Nos primeiros 2 anos (produtos novos) ou primeiro ano (recondicionados), presume-se
              que qualquer defeito existia na data de entrega, sem necessidade de prova pelo consumidor.
              O consumidor pode exigir reparação, substituição, redução do preço ou resolução do
              contrato. A reparação ou substituição é gratuita e deve ser concluída no prazo de 30 dias.
              Cada reparação confere um prazo adicional de 6 meses de garantia, até ao máximo de 4
              reparações.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong className="text-foreground">Direito de rejeição (primeiros 30 dias):</strong>{" "}
              Se o defeito for detetado nos primeiros 30 dias após a entrega, o consumidor pode
              exigir a substituição imediata ou a resolução do contrato com reembolso total, sem
              necessidade de aguardar reparação.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-6">
              9.2 Clientes Empresariais (B2B) — Código Civil
            </h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Nos termos do art. 921.º do Código Civil, o prazo de garantia legal para clientes
              empresariais é de <strong className="text-foreground">6 meses</strong> a contar da
              entrega. O defeito deve ser denunciado no prazo de 30 dias após o seu conhecimento.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-6">
              9.3 Exclusões de garantia
            </h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              A garantia não cobre:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Danos causados por utilização incorreta, negligência ou acidente;</li>
              <li>Danos por picos de tensão, descargas elétricas ou agentes externos;</li>
              <li>Desgaste normal resultante do uso;</li>
              <li>Danos físicos (quedas, impactos, líquidos);</li>
              <li>Produtos com selos ou etiquetas de garantia removidos ou adulterados;</li>
              <li>Consumíveis (tinteiros, toners, pilhas) com sinais de utilização superior a 30%.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Alguns fabricantes, nomeadamente no segmento de segurança eletrónica, disponibilizam
              garantia comercial adicional — nesses casos, o prazo mais favorável prevalece e será
              indicado no orçamento ou na ficha do produto.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              10. RMA — Assistência em Garantia
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Para acionar a garantia ou reportar um produto com avaria, o cliente deve:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Submeter o pedido na área "Os Meus RMAs" da sua conta, ou por email para{" "}
                <a href="mailto:geral@vrcf.pt" className="text-primary hover:underline">geral@vrcf.pt</a>;
              </li>
              <li>Indicar número de fatura, referência do produto, número de série e descrição do defeito;</li>
              <li>Aguardar aprovação antes de enviar o produto;</li>
              <li>Enviar na embalagem original, com todos os acessórios e número de RMA visível na embalagem exterior.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Não são aceites envios sem aprovação prévia. Confirmado defeito de fabrico dentro do
              prazo de garantia, a VRCF procede à reparação ou substituição sem custo para o cliente.
              Os custos de envio para a VRCF são da responsabilidade do cliente; o produto reparado
              ou substituído é devolvido sem custos adicionais de transporte (Portugal Continental).
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              11. Serviços de Instalação
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A VRCF disponibiliza serviços de instalação e configuração de equipamentos (sistemas de
              segurança, videovigilância, redes). Estes serviços são{" "}
              <strong className="text-foreground">inteiramente separados</strong> da venda de produtos
              e sujeitos a orçamento próprio. A aceitação de um orçamento de produto não inclui
              qualquer serviço de instalação, salvo indicação expressa e discriminada no orçamento.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              12. Responsabilidade
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A responsabilidade da VRCF limita-se ao valor do produto adquirido, sem prejuízo dos
              direitos legais dos consumidores. A VRCF não se responsabiliza por danos indiretos,
              lucros cessantes ou perda de dados, salvo nos casos expressamente previstos na lei.
              A VRCF não é responsável por atrasos resultantes de força maior, greves, falhas de
              fornecedores ou transportadoras.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              13. Propriedade Intelectual
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Todo o conteúdo do catálogo (textos, imagens, logótipos, estrutura e código) é
              propriedade da VRCF ou dos respetivos titulares, estando protegido pela legislação
              de propriedade intelectual. É proibida a reprodução ou utilização para fins comerciais
              sem autorização expressa.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              14. Proteção de Dados
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              O tratamento de dados pessoais rege-se pela{" "}
              <Link to="/politica-de-privacidade" className="text-primary hover:underline">
                Política de Privacidade
              </Link>{" "}
              disponível no catálogo, em conformidade com o RGPD e a Lei n.º 58/2019.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              15. Resolução de Litígios
            </h2>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">
              15.1 Clientes Particulares (B2C)
            </h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Em caso de litígio, o consumidor pode recorrer a uma entidade de Resolução Alternativa
              de Litígios (RAL), disponível em{" "}
              <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                www.consumidor.gov.pt
              </a>. A plataforma europeia de resolução de litígios em linha está disponível em{" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                ec.europa.eu/consumers/odr
              </a>.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">
              15.2 Clientes Empresariais (B2B)
            </h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Os litígios entre a VRCF e clientes empresariais serão submetidos aos tribunais da
              comarca de Setúbal, com expressa renúncia a qualquer outro foro.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">
              15.3 Livro de Reclamações
            </h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Acesso ao Livro de Reclamações Eletrónico em{" "}
              <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                www.livroreclamacoes.pt
              </a>. As reclamações recebidas serão respondidas no prazo de 15 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              16. Legislação Aplicável
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              As presentes CGV regem-se pela legislação portuguesa, nomeadamente:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Decreto-Lei n.º 7/2004 — comércio eletrónico;</li>
              <li>Decreto-Lei n.º 24/2014 — contratos celebrados à distância (direito de livre resolução);</li>
              <li>Decreto-Lei n.º 84/2021 — garantias na venda de bens e conteúdos digitais;</li>
              <li>Lei n.º 24/96 — Lei de Defesa do Consumidor;</li>
              <li>Código Civil Português — relações B2B (art. 921.º);</li>
              <li>Regulamento (UE) 2016/679 (RGPD) — proteção de dados pessoais.</li>
            </ul>
          </section>

          <div className="border-t border-border pt-6 mt-10 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">VRCF – Informática & Segurança</p>
            <p className="text-xs text-muted-foreground">
              <a href="https://showroom.vrcf.info" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                showroom.vrcf.info
              </a>{" "}
              | Atualizado em 15/06/2026
            </p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} VALTER ROBERTO CRUZ FRANCISCO UNI. LDA — NIF: 515237205
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default CondicoesVenda;
