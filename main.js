import './style.css';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { read, utils } from 'xlsx';

// Import worker directly as a URL asset (using .mjs for v4 compatibility)
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configurar o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Variáveis globais
let pdfDoc = null;
let pdfBytes = null;
let pdfArrayBuffer = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1.5;
let selectionActive = false;
let startX, startY, endX, endY;
let selectionCoordinates = null;
let canvasRect;
let processedFiles = [];
let pdfBlobs = {};
let zip = new JSZip();

// Elementos da interface
const pdfFileInput = document.getElementById('pdfFile');
const fileUpload = document.getElementById('fileUpload');
const fileUploadButton = document.getElementById('uploadButton');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const filePages = document.getElementById('filePages');
const continueToStep2 = document.getElementById('continueToStep2');
const backToStep1 = document.getElementById('backToStep1');
const continueToStep3 = document.getElementById('continueToStep3');
const backToStep2 = document.getElementById('backToStep2');
const continueToStep4 = document.getElementById('continueToStep4');
const pagesPerDocumentInput = document.getElementById('pagesPerDocument');
const textPageNumberInput = document.getElementById('textPageNumber');
const pdfCanvas = document.getElementById('pdfCanvas');
const pdfCanvasContainer = document.getElementById('pdfCanvasContainer');
const selectionOverlay = document.getElementById('selectionOverlay');
const selectionHighlight = document.getElementById('selectionHighlight');
const extractedTextContainer = document.getElementById('extractedTextContainer');
const extractedText = document.getElementById('extractedText');
const filenamePattern = document.getElementById('filenamePattern');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const resetSelectionBtn = document.getElementById('resetSelection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const processingSuccess = document.getElementById('processingSuccess');
const processingError = document.getElementById('processingError');
const resultFiles = document.getElementById('resultFiles');
const startOverBtn = document.getElementById('startOver');
const downloadZipBtn = document.getElementById('downloadZip');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const step4 = document.getElementById('step4');
const step5 = document.getElementById('step5');

// Novos elementos
const extractionMode = document.getElementById('extractionMode');
const regexContainer = document.getElementById('regexContainer');
const customRegex = document.getElementById('customRegex');
const filenamePrefix = document.getElementById('filenamePrefix');
const filenameSuffix = document.getElementById('filenameSuffix');
const defaultFilename = document.getElementById('defaultFilename');

// Evento de mudança no modo de extração
extractionMode.addEventListener('change', () => {
    if (extractionMode.value === 'regex') {
        regexContainer.classList.remove('hidden');
    } else {
        regexContainer.classList.add('hidden');
    }
});

// Evento de clique no botão de upload
fileUploadButton.addEventListener('click', () => {
    pdfFileInput.click();
});

// Evento de clique na área de upload
fileUpload.addEventListener('click', (e) => {
    if (e.target !== fileUploadButton) {
        pdfFileInput.click();
    }
});

// Evento de seleção de arquivo
pdfFileInput.addEventListener('change', handleFileSelect);

// Drag and drop para o upload de arquivo
fileUpload.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUpload.style.borderColor = 'var(--primary)';
    fileUpload.style.backgroundColor = 'rgba(67, 97, 238, 0.1)';
});

fileUpload.addEventListener('dragleave', (e) => {
    e.preventDefault();
    fileUpload.style.borderColor = 'var(--border)';
    fileUpload.style.backgroundColor = 'rgba(0, 0, 0, 0.01)';
});

fileUpload.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUpload.style.borderColor = 'var(--border)';
    fileUpload.style.backgroundColor = 'rgba(0, 0, 0, 0.01)';

    if (e.dataTransfer.files.length > 0) {
        pdfFileInput.files = e.dataTransfer.files;
        handleFileSelect();
    }
});

// Navegação entre etapas
continueToStep2.addEventListener('click', () => {
    if (!pdfBytes || pdfBytes.length === 0) {
        alert("Erro: Os dados do PDF não estão disponíveis. Por favor, selecione o arquivo novamente.");
        return;
    }

    step1.classList.add('hidden');
    step2.classList.remove('hidden');
});

backToStep1.addEventListener('click', () => {
    step2.classList.add('hidden');
    step1.classList.remove('hidden');
});

continueToStep3.addEventListener('click', () => {
    if (!pdfBytes || pdfBytes.length === 0) {
        alert("Erro: Os dados do PDF não estão disponíveis. Por favor, volte e selecione o arquivo novamente.");
        return;
    }

    const pagesPerDocument = parseInt(pagesPerDocumentInput.value);
    const textPageNumber = parseInt(textPageNumberInput.value);

    if (isNaN(pagesPerDocument) || pagesPerDocument < 1) {
        alert('Por favor, insira um número válido de páginas por documento.');
        return;
    }

    if (isNaN(textPageNumber) || textPageNumber < 1 || textPageNumber > pagesPerDocument) {
        alert(`Por favor, insira um número de página válido entre 1 e ${pagesPerDocument}.`);
        return;
    }

    // Se o modo não for "area", pular para etapa 4
    if (extractionMode.value !== 'area') {
        step2.classList.add('hidden');
        step4.classList.remove('hidden');
        processPdf();
        return;
    }

    step2.classList.add('hidden');
    step3.classList.remove('hidden');

    // Calcular a primeira página do primeiro documento
    const firstDocPage = 1 + (textPageNumber - 1);
    currentPage = firstDocPage;

    renderPdfPage(currentPage);
});

backToStep2.addEventListener('click', () => {
    step3.classList.add('hidden');
    step2.classList.remove('hidden');
});

continueToStep4.addEventListener('click', () => {
    if (!pdfBytes || pdfBytes.length === 0) {
        alert("Erro: Os dados do PDF não estão disponíveis. Por favor, volte e selecione o arquivo novamente.");
        return;
    }

    step3.classList.add('hidden');
    step4.classList.remove('hidden');
    processPdf();
});

startOverBtn.addEventListener('click', () => {
    resetApp();
    step5.classList.add('hidden');
    step1.classList.remove('hidden');
});

// Navegação do PDF
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderPdfPage(currentPage);
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        renderPdfPage(currentPage);
    }
});

// Zoom do PDF
zoomInBtn.addEventListener('click', () => {
    scale += 0.25;
    renderPdfPage(currentPage);
});

zoomOutBtn.addEventListener('click', () => {
    if (scale > 0.5) {
        scale -= 0.25;
        renderPdfPage(currentPage);
    }
});

// Reset da seleção
resetSelectionBtn.addEventListener('click', () => {
    clearSelection();
});

// Download do ZIP
downloadZipBtn.addEventListener('click', downloadZip);

// Função para lidar com a seleção de arquivo
function handleFileSelect() {
    if (pdfFileInput.files.length === 0) {
        return;
    }

    const file = pdfFileInput.files[0];
    if (file.type !== 'application/pdf') {
        alert('Por favor, selecione um arquivo PDF válido.');
        return;
    }

    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    filePages.textContent = 'Carregando...';
    fileInfo.classList.remove('hidden');
    fileInfo.classList.add('active');
    fileInfo.style.display = 'block';

    const fileReader = new FileReader();
    fileReader.onload = async function () {
        try {
            // Armazenar o ArrayBuffer original
            pdfArrayBuffer = fileReader.result;

            // Criar uma cópia dos bytes do PDF
            pdfBytes = new Uint8Array(pdfArrayBuffer);

            // Verificar se os dados são válidos
            if (!pdfBytes || pdfBytes.length < 10) {
                throw new Error("O arquivo PDF parece estar corrompido ou vazio");
            }

            console.log(`PDF carregado: ${pdfBytes.length} bytes`);

            // Carregar o PDF com PDF.js
            try {
                // Criar uma nova cópia dos dados para o PDF.js
                const pdfJsBytes = new Uint8Array(pdfArrayBuffer.slice(0));
                pdfDoc = await pdfjsLib.getDocument({ data: pdfJsBytes }).promise;
                totalPages = pdfDoc.numPages;
                filePages.textContent = `${totalPages} páginas`;

                // Habilitar o botão de continuar
                continueToStep2.disabled = false;

                // Configurar valores máximos
                pagesPerDocumentInput.max = totalPages;
                pagesPerDocumentInput.value = Math.min(parseInt(pagesPerDocumentInput.value) || 1, totalPages);
                textPageNumberInput.max = pagesPerDocumentInput.value;
                textPageNumberInput.value = Math.min(parseInt(textPageNumberInput.value) || 1, parseInt(pagesPerDocumentInput.value));

                console.log(`PDF carregado com sucesso: ${totalPages} páginas`);
            } catch (e) {
                console.error("Erro ao carregar PDF com PDF.js:", e);
                throw new Error("Não foi possível processar este PDF. Por favor, tente com outro arquivo.");
            }
        } catch (error) {
            console.error('Erro ao carregar o PDF:', error);
            alert(error.message || 'Não foi possível carregar o PDF. Verifique se o arquivo é válido.');
            filePages.textContent = 'Erro ao carregar o arquivo';
            continueToStep2.disabled = true;
        }
    };

    fileReader.onerror = function () {
        console.error('Erro ao ler o arquivo');
        alert('Erro ao ler o arquivo. Por favor, tente novamente.');
        filePages.textContent = '';
        continueToStep2.disabled = true;
    };

    // Ler o arquivo como ArrayBuffer para preservar os dados binários
    fileReader.readAsArrayBuffer(file);
}

// Função para renderizar uma página do PDF
async function renderPdfPage(pageNumber) {
    try {
        console.log(`Renderizando página ${pageNumber}...`);
        // Verificar se o PDF está carregado
        if (!pdfDoc) {
            console.error("PDF não carregado ao tentar renderizar página");
            throw new Error("PDF não carregado. Por favor, selecione o arquivo novamente.");
        }

        // Atualizar informações da página
        pageInfo.textContent = `Página ${pageNumber} de ${totalPages}`;

        // Habilitar/desabilitar botões de navegação
        prevPageBtn.disabled = pageNumber <= 1;
        nextPageBtn.disabled = pageNumber >= totalPages;

        // Obter a página
        const page = await pdfDoc.getPage(pageNumber);

        // Calcular dimensões
        const viewport = page.getViewport({ scale });
        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;

        // Renderizar a página
        const renderContext = {
            canvasContext: pdfCanvas.getContext('2d'),
            viewport: viewport
        };

        await page.render(renderContext).promise;

        // Atualizar o retângulo do canvas para seleção
        canvasRect = pdfCanvas.getBoundingClientRect();

        // Configurar o highlight para cobrir todo o canvas
        selectionHighlight.style.width = `${pdfCanvas.width}px`;
        selectionHighlight.style.height = `${pdfCanvas.height}px`;

        // Adicionar classe para mudar o cursor
        pdfCanvas.classList.add('selection-active');

        // Limpar seleção anterior se estiver mudando de página
        if (selectionCoordinates && selectionCoordinates.pageNumber === pageNumber) {
            // Mostrar a seleção existente na nova página
            showSelectionOverlay(selectionCoordinates);
        } else {
            clearSelection();
        }

        // Configurar eventos de seleção
        setupSelectionEvents();
    } catch (error) {
        console.error('Erro ao renderizar página:', error);
        alert('Erro ao renderizar a página do PDF: ' + error.message);
    }
}

// Configurar eventos de seleção
function setupSelectionEvents() {
    // Remover eventos anteriores para evitar duplicação
    pdfCanvas.removeEventListener('mousedown', startSelection);
    pdfCanvas.removeEventListener('mousemove', updateSelection);
    pdfCanvas.removeEventListener('mouseup', endSelection);
    document.removeEventListener('mouseup', endSelectionOutside);

    // Adicionar novos eventos
    pdfCanvas.addEventListener('mousedown', startSelection);
    pdfCanvas.addEventListener('mousemove', updateSelection);
    pdfCanvas.addEventListener('mouseup', endSelection);
    document.addEventListener('mouseup', endSelectionOutside);

    // Mostrar o highlight quando o mouse estiver sobre o canvas
    pdfCanvas.addEventListener('mouseover', () => {
        selectionHighlight.style.display = 'block';
    });

    pdfCanvas.addEventListener('mouseout', () => {
        if (!selectionActive) {
            selectionHighlight.style.display = 'none';
        }
    });
}

// Função para iniciar a seleção
function startSelection(e) {
    e.preventDefault();
    selectionActive = true;

    // Obter posição do canvas
    const rect = pdfCanvas.getBoundingClientRect();

    // Calcular posição relativa ao canvas
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    // Garantir que as coordenadas estejam dentro dos limites do canvas
    startX = Math.max(0, Math.min(startX, pdfCanvas.width));
    startY = Math.max(0, Math.min(startY, pdfCanvas.height));

    // Inicializar o overlay
    selectionOverlay.style.left = `${startX}px`;
    selectionOverlay.style.top = `${startY}px`;
    selectionOverlay.style.width = '0px';
    selectionOverlay.style.height = '0px';
    selectionOverlay.classList.remove('hidden');
    selectionOverlay.style.display = 'block';

    // Esconder o highlight durante a seleção
    selectionHighlight.style.display = 'none';
}

// Função para atualizar a seleção
function updateSelection(e) {
    if (!selectionActive) return;

    e.preventDefault();

    // Obter posição do canvas
    const rect = pdfCanvas.getBoundingClientRect();

    // Calcular posição relativa ao canvas
    endX = e.clientX - rect.left;
    endY = e.clientY - rect.top;

    // Garantir que as coordenadas estejam dentro dos limites do canvas
    endX = Math.max(0, Math.min(endX, pdfCanvas.width));
    endY = Math.max(0, Math.min(endY, pdfCanvas.height));

    // Calcular dimensões
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    // Calcular posição do canto superior esquerdo
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);

    // Atualizar overlay
    selectionOverlay.style.left = `${left}px`;
    selectionOverlay.style.top = `${top}px`;
    selectionOverlay.style.width = `${width}px`;
    selectionOverlay.style.height = `${height}px`;
}

// Função para finalizar a seleção
async function endSelection(e) {
    if (!selectionActive) return;

    e.preventDefault();
    selectionActive = false;

    // Verificar se a seleção é válida
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    if (width < 10 || height < 10) {
        // Seleção muito pequena, ignorar
        selectionOverlay.classList.add('hidden');
        selectionOverlay.style.display = 'none';
        selectionHighlight.style.display = 'block';
        return;
    }

    try {
        // Salvar coordenadas da seleção
        selectionCoordinates = {
            left: Math.min(startX, endX) / scale,
            top: Math.min(startY, endY) / scale,
            right: Math.max(startX, endX) / scale,
            bottom: Math.max(startY, endY) / scale,
            pageNumber: currentPage
        };

        // Extrair texto da área selecionada
        const extractedTextValue = await extractTextFromSelection(currentPage, selectionCoordinates);

        if (extractedTextValue && extractedTextValue.trim() !== '') {
            extractedText.textContent = extractedTextValue;
            extractedTextContainer.classList.remove('hidden');
            extractedTextContainer.style.display = 'block';
            continueToStep4.disabled = false;
        } else {
            alert('Nenhum texto foi encontrado na área selecionada. Por favor, tente novamente.');
            clearSelection();
            selectionHighlight.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao extrair texto:', error);
        alert('Erro ao extrair texto da área selecionada: ' + error.message);
        clearSelection();
        selectionHighlight.style.display = 'block';
    }
}

// Função para lidar com o fim da seleção fora do canvas
function endSelectionOutside(e) {
    if (selectionActive) {
        selectionActive = false;

        // Verificar se a seleção é válida
        if (startX !== undefined && endX !== undefined) {
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);

            if (width >= 10 && height >= 10) {
                // A seleção é válida, manter o overlay
                return;
            }
        }

        // Seleção inválida, esconder o overlay
        selectionOverlay.classList.add('hidden');
        selectionOverlay.style.display = 'none';
        selectionHighlight.style.display = 'none';
    }
}

// Função para extrair texto da seleção
async function extractTextFromSelection(pageNum, coordinates) {
    try {
        if (!pdfDoc) {
            throw new Error("PDF não carregado ao tentar extrair texto");
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 }); // Escala 1.0 para coordenadas reais

        // Inverter coordenadas Y (PDF tem origem no canto inferior esquerdo)
        const pdfTop = viewport.height - coordinates.bottom;
        const pdfBottom = viewport.height - coordinates.top;

        // Extrair texto
        const textContent = await page.getTextContent();
        let extractedText = '';

        for (const item of textContent.items) {
            const tx = item.transform[4];
            const ty = item.transform[5];

            // Verificar se o item está dentro da área selecionada
            if (tx >= coordinates.left && tx <= coordinates.right && ty >= pdfTop && ty <= pdfBottom) {
                extractedText += item.str + ' ';
            }
        }

        return extractedText.trim();
    } catch (error) {
        console.error('Erro ao extrair texto:', error);
        throw error;
    }
}

// Função para extração inteligente (CPF, Email, Regex)
async function extractTextSmart(pageNum, mode) {
    try {
        if (!pdfDoc) throw new Error("PDF não carregado");

        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Juntar todo o texto da página
        const fullText = textContent.items.map(item => item.str).join(' ');

        let regex;
        switch (mode) {
            case 'cpf':
                regex = /\d{3}\.\d{3}\.\d{3}-\d{2}/;
                break;
            case 'email':
                regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
                break;
            case 'regex':
                try {
                    regex = new RegExp(customRegex.value);
                } catch (e) {
                    console.error("Regex inválido:", e);
                    return null;
                }
                break;
            default:
                return null;
        }

        const match = fullText.match(regex);
        return match ? match[0] : null;

    } catch (error) {
        console.error('Erro na extração inteligente:', error);
        return null;
    }
}

// Função para mostrar a seleção existente
function showSelectionOverlay(coordinates) {
    // Converter coordenadas do PDF para coordenadas do canvas
    const left = coordinates.left * scale;
    const top = coordinates.top * scale;
    const width = (coordinates.right - coordinates.left) * scale;
    const height = (coordinates.bottom - coordinates.top) * scale;

    // Atualizar overlay
    selectionOverlay.style.left = `${left}px`;
    selectionOverlay.style.top = `${top}px`;
    selectionOverlay.style.width = `${width}px`;
    selectionOverlay.style.height = `${height}px`;
    selectionOverlay.classList.remove('hidden');
    selectionOverlay.style.display = 'block';

    // Esconder o highlight quando há uma seleção
    selectionHighlight.style.display = 'none';
}

// Função para limpar a seleção
function clearSelection() {
    selectionOverlay.classList.add('hidden');
    selectionOverlay.style.display = 'none';
    selectionCoordinates = null;
    continueToStep4.disabled = true;
    extractedTextContainer.classList.add('hidden');
    extractedTextContainer.style.display = 'none';

    // Mostrar o highlight novamente
    selectionHighlight.style.display = 'block';
}

// Função para processar o PDF
async function processPdf() {
    try {
        console.log('Iniciando processamento do PDF...');

        // Verificar se temos os bytes do PDF
        if (!pdfBytes || pdfBytes.length === 0) {
            console.error("Dados do PDF não disponíveis no início do processamento");
            throw new Error("Dados do PDF não estão disponíveis. Por favor, recarregue a página e tente novamente.");
        }

        // Obter configurações
        const pagesPerDocument = parseInt(pagesPerDocumentInput.value);
        const textPageOffset = parseInt(textPageNumberInput.value) - 1; // Converter para índice baseado em 0

        // Calcular número de documentos
        const numDocuments = Math.ceil(totalPages / pagesPerDocument);
        console.log(`Total de páginas: ${totalPages}, Páginas por documento: ${pagesPerDocument}, Total de documentos: ${numDocuments}`);

        // Resetar variáveis
        processedFiles = [];
        pdfBlobs = {};
        zip = new JSZip();

        // Pré-carregar o PDF com PDF-LIB para processamento
        console.log("Carregando PDF com PDF-LIB...");
        let originalPdfDoc;

        try {
            // Criar uma cópia fresca dos dados para o PDF-LIB
            const pdfLibBytes = new Uint8Array(pdfArrayBuffer.slice(0));
            originalPdfDoc = await PDFDocument.load(pdfLibBytes);
            console.log("PDF carregado com sucesso no PDF-LIB");
        } catch (error) {
            console.error("Erro ao carregar PDF com PDF-LIB:", error);
            throw new Error("Não foi possível processar o PDF. Erro: " + error.message);
        }

        // Processar cada documento
        for (let docIndex = 0; docIndex < numDocuments; docIndex++) {
            // Calcular páginas para este documento
            const startPage = docIndex * pagesPerDocument + 1; // Página inicial (baseada em 1)
            const endPage = Math.min((docIndex + 1) * pagesPerDocument, totalPages); // Página final

            // Calcular a página onde está o texto para extração
            const textPage = startPage + textPageOffset;

            // Verificar se a página de texto está dentro do intervalo válido
            if (textPage > endPage) {
                throw new Error(`A página de texto (${textPage}) está fora do intervalo válido para o documento ${docIndex + 1} (${startPage}-${endPage}).`);
            }

            // Atualizar progresso
            const progress = Math.round((docIndex / numDocuments) * 50);
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Extraindo texto do documento ${docIndex + 1}/${numDocuments}`;
            progressPercent.textContent = `${progress}%`;

            // Permitir que a UI atualize
            await new Promise(resolve => setTimeout(resolve, 10));

            // Extrair texto para o nome do arquivo
            let docName = '';
            try {
                if (extractionMode.value === 'area') {
                    docName = await extractTextFromSelection(textPage, selectionCoordinates);
                } else {
                    docName = await extractTextSmart(textPage, extractionMode.value);
                }

                if (!docName || docName.trim() === '') {
                    docName = defaultFilename.value || `documento_${docIndex + 1}`;
                }
            } catch (error) {
                console.warn(`Erro ao extrair texto para o documento ${docIndex + 1}:`, error);
                docName = defaultFilename.value || `documento_${docIndex + 1}`;
            }

            // Limpar o nome do documento para uso em nome de arquivo
            docName = sanitizeFilename(docName);

            // Processar cada página do documento
            for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                // Atualizar progresso
                const pageProgress = 50 + Math.round(((pageNum - startPage) / (endPage - startPage + 1) + docIndex) / numDocuments * 50);
                progressFill.style.width = `${pageProgress}%`;
                progressText.textContent = `Processando página ${pageNum} do documento ${docIndex + 1}`;
                progressPercent.textContent = `${pageProgress}%`;

                // Permitir que a UI atualize
                await new Promise(resolve => setTimeout(resolve, 10));

                try {
                    // Criar PDF de página única
                    const newPdfDoc = await PDFDocument.create();
                    const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [pageNum - 1]);
                    newPdfDoc.addPage(copiedPage);

                    // Salvar o novo PDF
                    const pagePdfBytes = await newPdfDoc.save();

                    // Lookup na planilha (se configurado)
                    let lookupValue = '';
                    if (spreadsheetData && searchColumnSelect.value && valueColumnSelect.value) {
                        const searchCol = searchColumnSelect.value;
                        const valCol = valueColumnSelect.value;

                        // Busca insensível a maiúsculas/minúsculas e espaços
                        const normalizedDocName = docName.toLowerCase().trim();

                        const foundRow = spreadsheetData.find(row => {
                            const rowVal = String(row[searchCol] || '').toLowerCase().trim();
                            return rowVal === normalizedDocName;
                        });

                        if (foundRow) {
                            lookupValue = String(foundRow[valCol] || '').trim();
                        }
                    }

                    // Gerar nome do arquivo
                    const pageInDoc = pageNum - startPage + 1;
                    const fileName = generateFileName(docName, pageInDoc, lookupValue);

                    // Adicionar ao ZIP
                    zip.file(`${fileName}.pdf`, pagePdfBytes);

                    // Armazenar o blob para download individual
                    const pdfBlob = new Blob([pagePdfBytes], { type: 'application/pdf' });
                    pdfBlobs[`${fileName}.pdf`] = pdfBlob;

                    processedFiles.push({
                        docIndex: docIndex + 1,
                        pageNum,
                        pageInDoc,
                        fileName,
                        docName
                    });
                } catch (error) {
                    console.error(`Erro ao processar página ${pageNum}:`, error);
                    throw new Error(`Erro ao processar página ${pageNum}: ${error.message}`);
                }
            }
        }

        // Finalizar progresso
        progressFill.style.width = '100%';
        progressText.textContent = 'Processamento concluído!';
        progressPercent.textContent = '100%';

        // Mostrar resultados
        displayResults();

        // Avançar para a etapa de download
        setTimeout(() => {
            step4.classList.add('hidden');
            step5.classList.remove('hidden');
        }, 500);
    } catch (error) {
        console.error('Erro ao processar PDF:', error);
        processingSuccess.classList.add('hidden');
        processingError.classList.remove('hidden');
        processingError.style.display = 'block';
        processingError.textContent = `Erro: ${error.message}`;

        // Avançar para a etapa de download mesmo com erro
        setTimeout(() => {
            step4.classList.add('hidden');
            step5.classList.remove('hidden');
        }, 500);
    }
}

// Função para gerar nome de arquivo
function generateFileName(docName, pageInDoc, lookupValue = '') {
    let pattern = filenamePattern.value || '{text}_pagina{page}';

    // Substituir placeholders
    let fileName = pattern
        .replace('{text}', docName)
        .replace('{page}', pageInDoc)
        .replace('{lookup}', lookupValue);

    // Adicionar prefixo e sufixo
    if (filenamePrefix.value) fileName = filenamePrefix.value + fileName;
    if (filenameSuffix.value) fileName = fileName + filenameSuffix.value;

    return fileName;
}

// Função para limpar nome de arquivo
function sanitizeFilename(name) {
    // Remover caracteres inválidos para nome de arquivo
    return name.replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 100); // Limitar tamanho
}

// Função para exibir resultados
function displayResults() {
    resultFiles.innerHTML = '';

    // Agrupar arquivos por documento
    const docGroups = {};

    processedFiles.forEach(file => {
        if (!docGroups[file.docIndex]) {
            docGroups[file.docIndex] = [];
        }
        docGroups[file.docIndex].push(file);
    });

    // Exibir arquivos agrupados por documento
    Object.keys(docGroups).forEach(docIndex => {
        const files = docGroups[docIndex];
        const docName = files[0].docName;

        // Criar cabeçalho do documento
        const docHeader = document.createElement('div');
        docHeader.className = 'alert alert-info';
        docHeader.style.marginTop = '1rem';
        docHeader.style.marginBottom = '0.5rem';
        docHeader.textContent = `Documento ${docIndex}: ${docName}`;
        resultFiles.appendChild(docHeader);

        // Listar arquivos do documento
        files.forEach(file => {
            const fileElement = document.createElement('div');
            fileElement.className = 'result-file';

            // Adicionar link de download individual
            const downloadLink = document.createElement('a');
            downloadLink.className = 'download-individual';
            downloadLink.textContent = 'Baixar';
            downloadLink.href = '#';
            downloadLink.addEventListener('click', (e) => {
                e.preventDefault();
                downloadSingleFile(`${file.fileName}.pdf`);
            });

            fileElement.innerHTML = `
                <span class="result-file-name">${file.fileName}.pdf</span>
                <span class="result-file-pages">Página ${file.pageInDoc} de ${files.length}</span>
            `;

            fileElement.appendChild(downloadLink);
            resultFiles.appendChild(fileElement);
        });
    });
}

// Função para baixar um único arquivo
function downloadSingleFile(fileName) {
    try {
        console.log(`Iniciando download do arquivo: ${fileName}`);
        if (pdfBlobs[fileName]) {
            saveAs(pdfBlobs[fileName], fileName);
        } else {
            console.error(`Arquivo não encontrado: ${fileName}`);
            alert(`Erro: Arquivo ${fileName} não encontrado.`);
        }
    } catch (error) {
        console.error('Erro ao baixar arquivo individual:', error);
        alert('Erro ao baixar o arquivo. Por favor, tente novamente.');
    }
}

// Função para baixar o ZIP
async function downloadZip() {
    try {
        console.log('Iniciando geração do arquivo ZIP...');

        // Verificar se há arquivos para baixar
        if (processedFiles.length === 0) {
            alert('Não há arquivos para baixar.');
            return;
        }

        // Gerar o arquivo ZIP
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        console.log('Arquivo ZIP gerado com sucesso. Tamanho:', formatFileSize(zipBlob.size));

        // Obter nome do arquivo original
        const originalFileName = pdfFileInput.files[0].name.replace('.pdf', '');

        // Baixar o arquivo ZIP usando FileSaver
        console.log('Iniciando download do ZIP...');
        saveAs(zipBlob, `${originalFileName}_renomeado.zip`);
        console.log('Download iniciado com sucesso!');
    } catch (error) {
        console.error('Erro ao gerar ou baixar arquivo ZIP:', error);
        alert('Erro ao gerar arquivo ZIP. Por favor, tente novamente.');
    }
}

// Função para formatar o tamanho do arquivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Função para resetar o aplicativo
function resetApp() {
    // Resetar variáveis
    pdfDoc = null;
    pdfBytes = null;
    pdfArrayBuffer = null;
    currentPage = 1;
    totalPages = 0;
    scale = 1.5;
    selectionCoordinates = null;
    processedFiles = [];
    pdfBlobs = {};
    zip = new JSZip();

    // Resetar interface
    pdfFileInput.value = '';
    fileInfo.classList.remove('active');
    fileInfo.style.display = 'none';
    fileName.textContent = '-';
    fileSize.textContent = '-';
    filePages.textContent = '-';
    continueToStep2.disabled = true;

    // Resetar campos
    pagesPerDocumentInput.value = '1';
    textPageNumberInput.value = '1';
    filenamePattern.value = '{text}_pagina{page}';

    // Limpar canvas
    const ctx = pdfCanvas.getContext('2d');
    ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);

    // Resetar seleção
    clearSelection();

    // Resetar progresso
    progressFill.style.width = '0%';
    progressText.textContent = 'Preparando...';
    progressPercent.textContent = '0%';

    // Resetar resultados
    processingSuccess.classList.remove('hidden');
    processingSuccess.style.display = 'block';
    processingError.classList.add('hidden');
    processingError.style.display = 'none';
    resultFiles.innerHTML = '';
}
