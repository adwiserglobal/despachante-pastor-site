const printButton = document.getElementById("print-action");
const printStatus = document.getElementById("print-status");
const printError = document.getElementById("print-error");
const formRoot = document.getElementById("form-root");
const attachmentRoot = document.getElementById("attachment-root");

let payloadReceived = false;

printButton.addEventListener("click", () => {
  window.focus();
  window.print();
});

function withTimeout(promise, milliseconds, message) {
  let timeoutId;
  const timeout = new Promise((resolve, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function loadPdfLibrary() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);

  return withTimeout(new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
    script.onload = () => window.pdfjsLib
      ? resolve(window.pdfjsLib)
      : reject(new Error("O leitor de PDF não foi inicializado."));
    script.onerror = () => reject(new Error("Não foi possível carregar o leitor de PDF. Verifique sua conexão."));
    document.head.appendChild(script);
  }), 20000, "O leitor de PDF demorou demais para carregar. Verifique sua conexão e tente novamente.");
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function renderForm(sections) {
  formRoot.replaceChildren();
  sections.forEach((sectionData) => {
    const section = makeElement("section");
    section.appendChild(makeElement("h2", "", sectionData.title));
    const table = makeElement("table");
    const tbody = makeElement("tbody");

    (sectionData.items || []).forEach((item) => {
      const row = makeElement("tr");
      row.appendChild(makeElement("th", "", item.label));
      row.appendChild(makeElement("td", "", item.value));
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    section.appendChild(table);
    formRoot.appendChild(section);
  });
}

async function renderAttachments(attachments) {
  attachmentRoot.replaceChildren();
  if (!attachments.length) return;

  attachmentRoot.appendChild(makeElement("h2", "attachments-title", "Anexos do formulário"));

  const pdfAttachments = attachments.filter((item) => item.kind === "pdf");
  let pdfjsLib = null;

  if (pdfAttachments.length) {
    printStatus.textContent = "Carregando leitor de PDF...";
    pdfjsLib = await loadPdfLibrary();
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }

  for (let index = 0; index < attachments.length; index += 1) {
    const attachment = attachments[index];
    printStatus.textContent = "Carregando anexo " + (index + 1) + " de " + attachments.length + "...";

    const block = makeElement("section", "attachment-block");
    if (index > 0) block.classList.add("next-attachment");
    block.appendChild(makeElement("h3", "attachment-label", attachment.label));
    attachmentRoot.appendChild(block);

    if (attachment.kind === "pdf") {
      const pdf = await withTimeout(
        pdfjsLib.getDocument({ url: attachment.url }).promise,
        30000,
        "O PDF demorou demais para carregar: " + attachment.label
      );

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.setAttribute("aria-label", attachment.label + " - página " + pageNumber);
        const context = canvas.getContext("2d", { alpha: false });
        await page.render({ canvasContext: context, viewport }).promise;

        const pageWrap = makeElement("div", "pdf-attachment-page");
        if (pageNumber > 1) pageWrap.classList.add("next-pdf-page");
        pageWrap.appendChild(canvas);
        block.appendChild(pageWrap);
      }
    } else {
      const imageWrap = makeElement("div", "image-attachment-page");
      const image = document.createElement("img");
      image.className = "attachment-image";
      image.alt = attachment.label;
      await withTimeout(new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Não foi possível carregar o anexo de imagem: " + attachment.label));
        image.src = attachment.url;
      }), 30000, "O anexo de imagem demorou demais para carregar: " + attachment.label);
      imageWrap.appendChild(image);
      block.appendChild(imageWrap);
    }
  }
}

async function receivePrintPayload(data) {
  if (payloadReceived) return;
  payloadReceived = true;

  try {
    const { title, meta, sections = [], attachments = [], mode = "all" } = data;
    const attachmentsOnly = mode === "attachments";
    if (!attachmentsOnly && !sections.length) throw new Error("O formulário não possui respostas para imprimir.");
    if (attachmentsOnly && !attachments.length) throw new Error("Não há documentos anexados para imprimir.");
    document.title = (title || (attachmentsOnly ? "Documentos anexados" : "Formulário de visto")) + " - Impressão";
    document.getElementById("document-title").textContent = title || "Formulário de visto";
    document.getElementById("document-meta").textContent = meta || "";
    document.getElementById("document-footer").textContent =
      "Documento gerado pela área interna em " + new Date().toLocaleString("pt-BR");

    if (attachmentsOnly) {
      formRoot.hidden = true;
      attachmentRoot.classList.add("attachments-only");
    } else {
      formRoot.hidden = false;
      renderForm(sections);
    }
    await renderAttachments(attachments);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    printStatus.textContent = attachmentsOnly
      ? attachments.length + " documento(s) pronto(s). Abrindo a impressão..."
      : (attachments.length
        ? "Formulário e " + attachments.length + " anexo(s) prontos. Abrindo a impressão..."
        : "Formulário pronto. Abrindo a impressão.");
    printButton.textContent = "Imprimir novamente";
    printButton.disabled = false;

    // O clique original já abriu esta janela. Assim que tudo estiver pronto,
    // abrimos a caixa nativa de impressão sem exigir um segundo clique.
    window.setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch (printError) {
        console.error("Não foi possível abrir a caixa de impressão automaticamente:", printError);
        printStatus.textContent = "Tudo pronto. Clique em Imprimir novamente.";
      }
    }, 300);
  } catch (error) {
    console.error("Falha ao preparar impressão:", error);
    printError.hidden = false;
    printError.textContent = "Não foi possível preparar todos os anexos. " +
      (error && error.message ? error.message : "Tente novamente.");
    printStatus.textContent = "Falha ao preparar os arquivos.";
    printButton.disabled = true;
  }
}

function showPrintError(message) {
  printError.hidden = false;
  printError.textContent = message;
  printStatus.textContent = "Não foi possível preparar a impressão.";
  printButton.disabled = true;
}

function decodePrintPayload() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const encoded = params.get("payload");

  // Remove os dados pessoais da barra de endereço e do histórico antes de renderizar.
  window.history.replaceState(null, "", window.location.pathname + window.location.search);

  if (!encoded) throw new Error("Os dados do formulário não chegaram à página de impressão. Feche esta janela e tente novamente.");

  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const payload = JSON.parse(new TextDecoder().decode(bytes));

  if (!payload || !Array.isArray(payload.sections)) {
    throw new Error("Os dados de impressão chegaram em um formato inválido.");
  }
  if (!Array.isArray(payload.attachments)) payload.attachments = [];
  if (payload.mode === "attachments" ? !payload.attachments.length : !payload.sections.length) {
    throw new Error(payload.mode === "attachments"
      ? "Não há documentos anexados para imprimir."
      : "O formulário chegou sem respostas para imprimir.");
  }
  return payload;
}

try {
  const payload = decodePrintPayload();
  // A página de impressão não precisa manter referência à área interna.
  window.opener = null;
  receivePrintPayload(payload);
} catch (error) {
  console.error("Falha ao receber formulário para impressão:", error);
  showPrintError(error && error.message ? error.message : "Não foi possível receber os dados do formulário.");
}
