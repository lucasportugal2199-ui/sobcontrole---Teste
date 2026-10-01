<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SobControle — Gerenciador Financeiro Inteligente

O **SobControle** é um aplicativo moderno de finanças pessoais projetado para rodar de forma fluida tanto na Web quanto em dispositivos Android. Desenvolvido com uma abordagem *offline-first*, ele garante que você possa gerenciar seus dados a qualquer momento, sincronizando tudo de forma segura na nuvem assim que uma conexão for restabelecida.

Confira o aplicativo no AI Studio: [Acesse o App](https://ai.studio/apps/drive/1wr9K-J7so-_p4hQs1ly44o--4wi3ZIER)

---

## 🚀 Principais Funcionalidades

- **Dashboard Inteligente**: Visualização interativa de despesas por categoria, receitas, orçamentos e distribuição baseada na regra 50/30/20.
- **Gestão de Contas e Cartões**: Controle centralizado de contas correntes, cartões de crédito (com datas de fechamento e vencimento de faturas) e assinaturas ativas.
- **Consultor Financeiro de IA (Gemini)**: Chat integrado alimentado pela API do Gemini para analisar gastos, fornecer insights financeiros e escanear extratos.
- **Planejador de Metas**: Ferramenta para definir metas de economia (Savings Goals) com calculadora integrada para simular o tempo de conquista.
- **Abordagem Offline-First**: O app armazena seus dados localmente e utiliza um motor de sincronização inteligente (*smart merge*) para sincronizar com o Supabase de forma segura e transparente.
- **Segurança Móvel**: Autenticação biométrica (impressão digital/reconhecimento facial) e controle de acesso integrado.
- **Notificações Inteligentes**: Alertas automáticos e lembretes para que você nunca perca o vencimento de uma fatura ou boleto.

---

## 🛠️ Stack Tecnológica

- **Frontend & Web Core**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/), [Recharts](https://recharts.org/) (gráficos interativos).
- **Backend & Database**: [Supabase](https://supabase.com/) (Autenticação, Banco de Dados Relacional Postgres e sincronização em tempo real).
- **Mobile Integration**: [Capacitor v7](https://capacitorjs.com/) (Plugins de Haptics, Local Notifications, Filesystem, Biometria e Logins Sociais).
- **Inteligência Artificial**: SDK oficial do [Google Gen AI](https://github.com/google/generative-ai-js) para integração com o Gemini.

---

## ⚙️ Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) instalado em sua máquina.

### Passo 1: Instalação das Dependências
Instale todos os pacotes necessários executando o comando a seguir na raiz do projeto:
```bash
npm install
```

### Passo 2: Configuração do Ambiente
Crie ou configure o seu arquivo `.env.local` na raiz do projeto e insira suas credenciais:
```env
VITE_SUPABASE_URL=seu_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
GEMINI_API_KEY=sua_chave_api_do_gemini
```

### Passo 3: Executar a Versão Web
Inicie o servidor de desenvolvimento local:
```bash
npm run dev
```
O app estará disponível por padrão em `http://localhost:3000`. 

---

## 📱 Compilação e Execução no Android

O projeto utiliza o Capacitor para compilar a aplicação web e executá-la nativamente em dispositivos Android.

Sempre que realizar atualizações no código fonte da aplicação, execute os seguintes comandos em sequência para refletir as alterações no dispositivo móvel:

1. **Compilar a aplicação Web**:
   ```bash
   npm run build
   ```
2. **Sincronizar os assets e plugins com o projeto Android**:
   ```bash
   npm run android:sync
   ```
3. **Executar diretamente no emulador ou dispositivo físico conectado**:
   ```bash
   npm run android:run
   ```
4. **Abrir o projeto no Android Studio (opcional)**:
   ```bash
   npm run android:open
   ```

---

## ✨ Melhorias de UX Recentes

- **Correção dos Tutoriais de Boas-Vindas**: O fluxo foi otimizado para que o tutorial interativo seja iniciado de forma sequencial apenas após a finalização e fechamento do carrossel de Onboarding, eliminando sobreposições.
- **Carregamento Fluido com Skeleton Loader**: Substituição da tela em branco inicial pela exibição dinâmica de um esqueleto de carregamento (`SkeletonLoader`) durante a busca de dados e autenticação, fornecendo feedback visual imediato para o usuário.



