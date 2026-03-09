# Guia de Integração com o Leitor Biométrico WA26

> **Para quem é este guia?**
> Este guia foi escrito para alguém que nunca mexeu com hardware USB ou leitores biométricos antes. Cada passo é explicado do zero, sem assumir conhecimento prévio. Siga na ordem — cada etapa depende da anterior.

---

## O que você vai precisar

| Item | Observação |
|------|-----------|
| Leitor biométrico **WA26 Boland** | O dispositivo físico |
| Cabo USB (geralmente micro-USB ou USB-A) | Vem na caixa do leitor |
| Computador com **Google Chrome** ou **Microsoft Edge** | Outros navegadores (Firefox, Safari) **não funcionam** para esta tarefa |
| O projeto rodando localmente (`npm run dev` no diretório `app/`) | A tela de cadastro de digitais precisa estar acessível |
| Um terminal de linha de comando aberto | Para rodar scripts de diagnóstico |

---

## Por que precisamos fazer isso?

O código do sistema já está pronto para ler digitais, mas ele precisa saber qual é o "endereço" do leitor WA26 dentro do computador. Todo dispositivo USB tem dois números que o identificam:

- **`vendorId`** → identifica o *fabricante* (ex.: "Boland")
- **`productId`** → identifica o *modelo exato* (ex.: "WA26")

Além disso, o WA26 pode enviar os dados da digital de dois jeitos diferentes, e precisamos descobrir qual ele usa:

- **Modo teclado** → o leitor "finge" ser um teclado e digita o template como se fosse texto
- **Modo HID bruto** → o leitor envia bytes crus via protocolo HID

O objetivo deste guia é descobrir esses três itens e registrá-los no código.

---

## Passo 1 — Conectar o leitor ao computador

1. Pegue o cabo USB e conecte o leitor WA26 à porta USB do computador.
2. Aguarde alguns segundos. O Windows/Linux/macOS vai reconhecer o dispositivo automaticamente (você pode ouvir o som de "dispositivo conectado").
3. Não é necessário instalar nenhum driver manualmente — o WA26 usa drivers genéricos do sistema operacional.

> **Como saber se funcionou?**
> No Windows: abra o "Gerenciador de Dispositivos" (pressione `Win + X` → Gerenciador de Dispositivos) e procure por um novo dispositivo em "Dispositivos de Interface Humana (HID)" ou "Dispositivos USB".
> No Linux/macOS: abra o terminal e rode `lsusb`. O leitor deve aparecer na lista.

---

## Passo 2 — Descobrir o `vendorId` e o `productId`

Esta é a etapa mais importante. Você vai usar o navegador para perguntar ao sistema operacional quais são os IDs do leitor.

### 2.1 — Abra o Chrome ou o Edge

Abra o **Google Chrome** ou o **Microsoft Edge**. Nenhum outro navegador vai funcionar aqui.

### 2.2 — Abra o Console do Navegador

Pressione **F12** no teclado (ou clique com o botão direito em qualquer lugar da página → "Inspecionar"). Vai abrir uma janela de ferramentas de desenvolvedor. Clique na aba **"Console"**.

### 2.3 — Cole e rode este script

Clique dentro do Console, cole o código abaixo e pressione **Enter**:

```tcc/.claude/guides/snippets/discover-hid.js#L1-20
// Cole este código no Console do Chrome/Edge com o leitor conectado
(async () => {
  try {
    // Isso abre o seletor de dispositivos do navegador.
    // Uma janelinha vai aparecer pedindo para você escolher o leitor.
    const devices = await navigator.hid.requestDevice({ filters: [] });

    if (!devices.length) {
      console.warn("Nenhum dispositivo selecionado.");
      return;
    }

    const device = devices[0];
    console.log("✅ Dispositivo encontrado!");
    console.log("   Nome:      ", device.productName);
    console.log("   vendorId:  ", device.vendorId,  "(hex:", "0x" + device.vendorId.toString(16).toUpperCase() + ")");
    console.log("   productId: ", device.productId, "(hex:", "0x" + device.productId.toString(16).toUpperCase() + ")");
  } catch (err) {
    console.error("Erro:", err.message);
  }
})();
```

### 2.4 — Selecione o leitor na janela que aparecer

Uma janelinha do navegador vai abrir mostrando os dispositivos HID disponíveis. Procure pelo nome do WA26 (pode aparecer como "WA26", "Fingerprint Reader", "Boland" ou algo similar). Clique nele e depois em **"Conectar"**.

### 2.5 — Anote os valores exibidos no Console

O Console vai exibir algo parecido com:

```tcc/.claude/guides/snippets/example-output.txt#L1-5
✅ Dispositivo encontrado!
   Nome:       WA26 Fingerprint Reader
   vendorId:   6997  (hex: 0x1B55)
   productId:  2049  (hex: 0x0801)
```

**Anote esses dois números.** Você vai precisar deles no Passo 4.

> **Os números acima são apenas exemplos!** Os valores reais dependem do hardware físico. Não copie os exemplos — use os que aparecerem no seu Console.

---

## Passo 3 — Descobrir o modo de operação do leitor

Agora precisamos saber se o WA26 envia a digital como "texto de teclado" ou como "bytes HID". Vamos testar os dois.

### Teste A — Modo Teclado (mais provável no WA26)

1. Abra um editor de texto simples (Bloco de Notas no Windows, Gedit no Linux, TextEdit no macOS).
2. Clique dentro do editor para colocar o cursor lá.
3. Passe o dedo no leitor WA26.
4. **Observe o que acontece:**
   - Se aparecer uma sequência longa de letras e números (como `FE01020304...`) e depois o cursor pular para a próxima linha → **o leitor está em modo teclado**. ✅
   - Se não aparecer nada → o leitor não está em modo teclado. Vá para o Teste B.

> **O que é essa sequência?** É o "template" da sua digital — uma representação codificada das características únicas do seu dedo. Parece texto aleatório, mas é informação biométrica.

### Teste B — Modo HID Bruto

1. Com o Console do Chrome ainda aberto (do Passo 2), cole e rode o script abaixo:

```tcc/.claude/guides/snippets/test-hid-mode.js#L1-35
(async () => {
  try {
    const devices = await navigator.hid.requestDevice({ filters: [] });
    if (!devices.length) { console.warn("Nenhum dispositivo selecionado."); return; }

    const device = devices[0];
    await device.open();
    console.log("Canal HID aberto. Passe o dedo no leitor agora...");

    device.addEventListener("inputreport", (event) => {
      const bytes = new Uint8Array(event.data.buffer);
      const hex   = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(" ");
      console.log("📦 Relatório HID recebido:");
      console.log("   reportId:", event.reportId);
      console.log("   dados (hex):", hex);
    });

    // Aguarda 15 segundos e fecha
    setTimeout(async () => {
      await device.close();
      console.log("Canal fechado.");
    }, 15000);
  } catch (err) {
    console.error("Erro:", err.message);
  }
})();
```

2. Selecione o leitor na janelinha e passe o dedo.
3. **Observe o que acontece:**
   - Se aparecer "📦 Relatório HID recebido:" com bytes → **o leitor está em modo HID bruto**. ✅
   - Se não aparecer nada → o leitor não respondeu em modo HID neste canal.

### Resultado esperado

Na maioria das configurações de fábrica, o WA26 opera em **modo teclado**. Registre qual modo funcionou para usar no Passo 4.

---

## Passo 4 — Atualizar o código com as informações encontradas

Agora é a parte técnica: você vai editar um arquivo do projeto com os valores que descobriu.

### 4.1 — Abra o arquivo do hook

Abra o arquivo:

```
app/src/hooks/use-fingerprint-reader.ts
```

### 4.2 — Localize a constante `KNOWN_FINGERPRINT_FILTERS`

Procure por estas linhas (em torno da linha 62):

```tcc/.claude/guides/snippets/known-fingerprint-filters-placeholder.ts#L1-4
const KNOWN_FINGERPRINT_FILTERS: HIDDeviceFilter[] = [
  // Placeholder — preencher com o vendorId/productId real do WA26 após TASK 13
  { usagePage: 0x0001 }, // Generic Desktop Controls — abrange a maioria dos HID
];
```

### 4.3 — Substitua pelo valor real

Troque o conteúdo usando os números que você anotou no Passo 2.5. Use o valor **decimal** (o número sem o "0x"):

```tcc/.claude/guides/snippets/example-filter-update.ts#L1-8
// Exemplo — substitua pelos seus valores reais!
const KNOWN_FINGERPRINT_FILTERS: HIDDeviceFilter[] = [
  {
    vendorId:  6997, // ← coloque aqui o vendorId que o Console mostrou
    productId: 2049, // ← coloque aqui o productId que o Console mostrou
  },
];
```

> **Cuidado:** os números `6997` e `2049` são apenas exemplos. Use os que você coletou no seu Console no Passo 2.5.

### 4.4 — Salve o arquivo

Pressione **Ctrl+S** (Windows/Linux) ou **Cmd+S** (macOS) para salvar.

---

## Passo 5 — Validar o formato do template

Agora precisamos confirmar como o template chega ao sistema, para garantir que ele está sendo armazenado corretamente.

### 5.1 — Acesse a tela de cadastro de digital

1. Certifique-se de que o servidor e o app estão rodando (`npm run dev`).
2. Acesse a interface no navegador (geralmente `http://localhost:5173`).
3. Navegue até um usuário qualquer de teste e abra a aba de **Digitais**.

### 5.2 — Abra o Console do navegador

Pressione **F12** → aba **Console**.

### 5.3 — Inicie um cadastro de digital e observe

1. Clique em um dedo no desenho da mão para iniciar o cadastro.
2. Passe o dedo no leitor quando solicitado.
3. **Antes de confirmar**, no Console, o sistema exibirá o template capturado. Observe o formato:

**Formato modo teclado (esperado):**
```tcc/.claude/guides/snippets/template-keyboard-example.txt#L1-3
FE010203040506070809... (string hexadecimal longa, sem espaços)
```
ou
```tcc/.claude/guides/snippets/template-keyboard-alt-example.txt#L1-3
RSTU1234VWXY5678... (string alfanumérica — depende do firmware do WA26)
```

**Formato modo HID bruto (se aplicável):**
```tcc/.claude/guides/snippets/template-hid-example.txt#L1-3
fe 01 02 03 04 05 06 07 08 09... (bytes separados por espaço)
```

### 5.4 — Anote o formato observado

Registre a resposta a esta pergunta:

> "O template emitido pelo WA26 é uma string hexadecimal ISO 19794-2, ou é uma sequência alfanumérica arbitrária?"

Essa informação é importante para que o backend saiba como comparar templates na hora de identificar o usuário.

---

## Passo 6 — Testar a rejeição de template duplicado

Esta etapa garante que o sistema impede que a mesma digital seja cadastrada duas vezes (resposta HTTP 409 Conflict).

### 6.1 — Cadastre uma digital pela primeira vez

1. Acesse a tela de digitais de um usuário de teste.
2. Escolha um dedo e faça o cadastro normalmente. Confirme que aparece a mensagem de sucesso.

### 6.2 — Tente cadastrar a mesma digital novamente

1. **No mesmo dedo** (ou em outro dedo, para testar a validação de template duplicado global), inicie um novo cadastro.
2. Passe **o mesmo dedo** no leitor.
3. Tente confirmar o cadastro.

### 6.3 — Observe a resposta

**Comportamento esperado:** O sistema deve exibir uma mensagem de erro amigável, como:

> "Esta digital já está cadastrada no sistema."

No Console do navegador, você deve ver a requisição `POST /users/{id}/fingerprints` retornando **`409 Conflict`**.

**Se o 409 não aparecer:** O backend pode não estar validando templates duplicados. Registre esse comportamento para investigação posterior.

---

## Passo 7 — Documentar os resultados

Após completar todos os testes, preencha a tabela abaixo e salve junto com este arquivo (ou atualize o `todo.md`):

```tcc/.claude/guides/snippets/results-template.md#L1-22
## Resultados da Integração com o WA26

| Campo              | Valor encontrado |
|--------------------|-----------------|
| `vendorId` (decimal)  | _______________ |
| `vendorId` (hex)      | 0x_____________ |
| `productId` (decimal) | _______________ |
| `productId` (hex)     | 0x_____________ |
| Modo de operação      | ☐ keyboard  ☐ hid |
| Formato do template   | ☐ hex ISO 19794-2  ☐ string alfanumérica  ☐ outro: _______ |
| Tamanho do template   | ___ caracteres |
| 409 Conflict funciona?| ☐ Sim  ☐ Não |
| Data do teste         | ____/____/_______ |
| Testado por           | _______________ |

### Observações adicionais

(Escreva aqui qualquer comportamento inesperado, mensagens de erro estranhase, ou diferenças em relação ao esperado.)
```

---

## Resolução de Problemas Comuns

### "navigator.hid is undefined" no Console

**Causa:** Você está usando Firefox ou Safari, que não suportam a Web HID API.
**Solução:** Abra o mesmo endereço no **Google Chrome** ou **Microsoft Edge**.

---

### O leitor aparece no seletor, mas não consigo abrir o canal HID

**Causa provável:** O leitor está sendo bloqueado por um driver do sistema operacional que já está usando o dispositivo.
**Solução no Linux:**
1. Abra o terminal e rode:
   ```
   lsusb
   ```
   Anote o `ID` do leitor (formato `xxxx:yyyy`).
2. Crie uma regra udev para permitir acesso sem root. Rode no terminal (substitua `xxxx` e `yyyy` pelos seus valores):
   ```
   echo 'SUBSYSTEM=="hidraw", ATTRS{idVendor}=="xxxx", ATTRS{idProduct}=="yyyy", MODE="0666"' | sudo tee /etc/udev/rules.d/99-wa26.rules
   sudo udevadm control --reload-rules && sudo udevadm trigger
   ```
3. Desconecte e reconecte o leitor.

**Solução no Windows:**
- Certifique-se de que não há nenhum software do fabricante (Boland) rodando em segundo plano que possa estar bloqueando o acesso direto ao dispositivo.

---

### Nada aparece no editor de texto ao passar o dedo (Teste A)

**Possíveis causas:**
1. O cursor não estava dentro do editor — clique novamente no editor e tente de novo.
2. O leitor pode estar em modo HID bruto — execute o Teste B.
3. O dedo não foi lido corretamente — tente posicionar o dedo com mais firmeza e no centro do sensor.

---

### O template capturado tem tamanho diferente a cada leitura do mesmo dedo

**Isso é normal.** Leitores biométricos não produzem exatamente os mesmos bytes a cada leitura — há variações dependendo da pressão e posição do dedo. O algoritmo de comparação (matching) lida com essas diferenças. O que importa é que o **formato** (hex, alfanumérico, etc.) seja consistente.

---

### O sistema não retorna 409 para templates duplicados

**Causa:** O backend pode estar armazenando o template sem verificar duplicatas, ou a comparação não está implementada.
**O que fazer:** Abra uma issue no repositório descrevendo o comportamento observado, incluindo o template capturado (com a parte do meio omitida por privacidade) e a resposta HTTP recebida.

---

## Resumo dos Arquivos que Você Vai Editar

| Arquivo | O que alterar |
|---------|--------------|
| `app/src/hooks/use-fingerprint-reader.ts` | Linha ~62: preencher `vendorId` e `productId` em `KNOWN_FINGERPRINT_FILTERS` |
| `tcc/.claude/features/todo.md` | Marcar as tasks de hardware como concluídas após os testes |
| `tcc/.claude/guides/wa26-hid-guide.md` | (este arquivo) Preencher a tabela de resultados do Passo 7 |