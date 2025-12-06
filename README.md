# PDF Renamer Pro 🚀

O **PDF Renamer Pro** é uma ferramenta moderna e poderosa para separar, organizar e renomear arquivos PDF automaticamente. Ele permite extrair texto de áreas específicas do PDF ou usar padrões inteligentes (CPF, E-mail) para dar nome aos seus arquivos.

## ✨ Funcionalidades

*   **Separação de Documentos**: Divida PDFs grandes em arquivos menores (ex: 1 página por documento).
*   **Extração Visual**: Desenhe um retângulo na tela para capturar o texto que será o nome do arquivo.
*   **Extração Inteligente**:
    *   🆔 **CPF**: Encontra automaticamente CPFs (`000.000.000-00`) na página.
    *   📧 **E-mail**: Encontra endereços de e-mail.
    *   🔣 **Regex**: Use expressões regulares personalizadas.
*   **Enriquecimento com Excel/CSV**: Cruze o nome extraído com uma planilha de dados para adicionar informações extras (como CPF ou Matrícula) ao nome do arquivo.
*   **Nomenclatura Flexível**: Configure prefixos, sufixos e padrões de nome (ex: `RELATORIO_{text}_{page}.pdf`).
*   **100% Client-Side**: Tudo roda no seu navegador. Seus PDFs não são enviados para nenhum servidor, garantindo privacidade total.

## 🛠️ Tecnologias

*   **Vite**: Build tool super rápida.
*   **PDF.js**: Renderização e leitura de PDFs.
*   **PDF-Lib**: Manipulação e criação de novos PDFs.
*   **SheetJS (xlsx)**: Leitura de planilhas Excel e CSV.

## 🚀 Como Usar

### Instalação

1.  Clone o repositório.
2.  Instale as dependências:
    ```bash
    npm install
    ```

### Rodando Localmente

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```
Acesse o link que aparecerá no terminal (ex: `http://localhost:5173`).

### Fazendo o Build (Produção/Vercel)

Para gerar a versão otimizada para implantação:

```bash
npm run build
```
Os arquivos gerados estarão na pasta `dist/`.

## 📚 Guia Passo a Passo

1.  **Upload**: Arraste seu PDF para a área indicada.
2.  **Configuração**:
    *   Defina quantas páginas tem cada documento individual.
    *   Escolha onde está o texto do nome (qual página).
    *   **Modo de Extração**: Escolha entre desenhar uma área (`Seleção Visual`) ou usar busca automática (`CPF`, `E-mail`).
    *   *(Opcional)* **Planilha**: Carregue um Excel para cruzar dados. Use a tag `{lookup}` no padrão do nome.
3.  **Seleção (Se for visual)**: Desenhe um retângulo em volta do nome (ex: nome do funcionário no holerite).
4.  **Processar**: O sistema vai ler cada página, renomear e gerar os novos arquivos.
5.  **Download**: Baixe tudo de uma vez como um arquivo ZIP.

---
Desenvolvido com foco em produtividade e segurança.
