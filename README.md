# MU Maps Interactive Spots

Site estático para GitHub Pages. Permite escolher um mapa, clicar no local do spot, preencher o nome do char e salvar.

## Como usar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo: `mu-maps-spots`.
2. Envie todos os arquivos desta pasta para o repositório.
3. No GitHub, vá em **Settings > Pages**.
4. Em **Branch**, selecione `main` e `/root`.
5. Clique em **Save**.
6. Abra o link do GitHub Pages.

## Modo sem Google Sheets

Funciona direto no navegador, mas os spots ficam salvos só no computador/celular da pessoa.
Use **Exportar link** para gerar um link com os spots embutidos na URL.

## Modo com Google Sheets compartilhado

Use este modo para todos verem os mesmos spots.

1. Crie uma planilha Google.
2. Na planilha, vá em **Extensions > Apps Script**.
3. Cole o conteúdo do arquivo `google-apps-script.js`.
4. Clique em **Deploy > New deployment**.
5. Tipo: **Web app**.
6. Execute as: **Me**.
7. Who has access: **Anyone**.
8. Copie a URL do Web App.
9. Abra `config.js` e cole a URL em `GOOGLE_SCRIPT_URL`.

Depois disso, os botões **Sincronizar** e **Salvar online** vão usar a planilha.
