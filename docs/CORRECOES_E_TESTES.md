# Revisão e correções do MVP

## Prompt único de correções

Revise integralmente o MVP ImpulsoWeb. Corrija: (1) formulários que não validam consentimento, telefone ou e-mail; (2) falhas de persistência de leads, clientes, projeto e lembretes; (3) acesso a rotas privadas sem sessão; (4) inserção insegura de texto do usuário no HTML; (5) links do WhatsApp sem mensagem preenchida; (6) filtros e estados vazios do painel; (7) layout mobile, navegação e acessibilidade. Inclua testes automatizados para criação de lead, autenticação, alteração de status e lembretes. Não adicione pagamentos, contas de clientes ou serviços externos antes de validar a demanda.

## Testes manuais de aceitação (executar no ambiente publicado)

- [ ] Página abre em 360px, 768px e desktop
- [ ] Menu mobile abre e fecha; âncoras funcionam
- [ ] Campos obrigatórios bloqueiam envio incompleto
- [ ] Envio cria lead persistente e mostra confirmação
- [ ] WhatsApp abre com serviço, orçamento e contato
- [ ] Login inválido é recusado e login correto abre painel
- [ ] Leads ficam disponíveis após reiniciar o servidor
- [ ] Atualização de status e conversão em cliente funcionam
- [ ] Etapas do projeto podem ser atualizadas
- [ ] Lembrete pode ser criado, concluído e removido
- [ ] Logout invalida o acesso ao painel
- [ ] Não há senhas ou dados de clientes no repositório

Observação: a lista descreve verificações para executar, não resultados simulados com clientes reais.
