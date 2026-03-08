# Plataforma de Gestão de Renda

Aplicação web desenvolvida em **HTML, CSS e JavaScript** para auxiliar trabalhadores autônomos que utilizam motocicleta como ferramenta de trabalho no controle de **renda**, **custos operacionais**, **poupança** e **desempenho mensal**.

O sistema permite simular metas financeiras, registrar resultados diários e acompanhar o status do mês com base nos valores reais inseridos pelo usuário.

---

## Objetivo do projeto

Este projeto foi desenvolvido com foco em **organização financeira** e **autonomia econômica**, servindo como uma ferramenta simples de gestão de renda para trabalhadores que atuam com corridas, entregas ou serviços realizados com motocicleta.

A proposta está alinhada à **ODS 10 – Redução das Desigualdades**, ao oferecer uma solução de apoio à tomada de decisão financeira para trabalhadores autônomos.

---

## Funcionalidades

- Cadastro da configuração base do usuário:
  - veículo
  - preço do combustível
  - tarifa média por corrida
  - meta líquida mensal
  - valor do seguro
  - quantidade de dias trabalhados no mês

- Cálculo automático de:
  - custo por km
  - lucro por corrida
  - quantidade estimada de corridas por dia
  - faturamento bruto estimado diário
  - meta de poupança mensal
  - poupança diária automática

- Registro diário de:
  - faturamento bruto
  - quantidade de corridas
  - km rodados no dia
  - gasto com combustível
  - outros custos
  - observações

- Painel mensal com:
  - bruto acumulado
  - líquido acumulado
  - poupança acumulada
  - médias diárias
  - km médio histórico por corrida
  - custos operacionais
  - dias negativos
  - status geral do mês

- Exportação de relatório em **CSV**

- Armazenamento local com **LocalStorage**, sem necessidade de backend

---

## Tecnologias utilizadas

- **HTML5**
- **CSS3**
- **JavaScript Vanilla**
- **LocalStorage API**

---

## Estrutura do projeto

```bash
/
├── index.html
├── style.css
└── script.js
