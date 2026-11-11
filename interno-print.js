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
    const { title, meta, sections = [], attachments = [] } = data;
    document.title = (title || "Formulário de visto") + " - Impressão";
    document.getElementById("document-title").textContent = title || "Formulário de visto";
    document.getElementById("document-meta").textContent = meta || "";
    document.getElementById("document-footer").textContent =
      "Documento gerado pela área interna em " + new Date().toLocaleString("pt-BR");

    renderForm(sections);
    await renderAttachments(attachments);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    printStatus.textContent = attachments.length
      ? "Formulário e " + attachments.length + " anexo(s) prontos."
      : "Formulário pronto para impressão.";
    printButton.textContent = "Imprimir formulário e anexos";
    printButton.disabled = false;
  } catch (error) {
    console.error("Falha ao preparar impressão:", error);
    printError.hidden = false;
    printError.textContent = "Não foi possível preparar todos os anexos. " +
      (error && error.message ? error.message : "Tente novamente.");
    printStatus.textContent = "Falha ao preparar os arquivos.";
    printButton.disabled = true;
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window.opener) return;
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== "despachante-pastor:print-payload") return;
  receivePrintPayload(event.data.payload || {});
});

if (window.opener) {
  window.opener.postMessage({ type: "despachante-pastor:print-ready" }, window.location.origin);
} else {
  printStatus.textContent = "Abra a impressão pela área interna do sistema.";
}
