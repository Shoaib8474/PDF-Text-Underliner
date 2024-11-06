import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.mjs';

const workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;


 // Initialize DOM elements
 const pdfCanvas = document.getElementById('pdfCanvas'); //canvas tag
 const pdfContext = pdfCanvas.getContext('2d');    // dfOc
 const canvasWrapper = document.getElementById('canvas-wrapper');
 const colorPicker = document.getElementById('color-picker');
 const brushSize = document.getElementById('brush-size');
 const sizeLabel = document.getElementById('size-label');
 const downloadBtn = document.getElementById('downloadBtn');
 const prevPageBtn = document.getElementById('prevPage');
 const nextPageBtn = document.getElementById('nextPage');
 const undoBtn = document.getElementById('undo');
 const decreaseBtn = document.getElementById('decreaseBtn');
 const increaseBtn = document.getElementById('increaseBtn');
 const pageInfo = document.getElementById('page-info');
 const loadingMessage = document.getElementById('loading-message');
 const errorMessage = document.getElementById('error-message');
    
 
 // State management
    let currentPDF = null;
    let currentPage = 0;
    let totalPages = 0;
    let scale = 1.5;
    const drawingStates = new Map(); // Store drawings for each page
    let undoStack = new Map(); // Store removed objects for each page
    let redoStack = new Map(); // Store objects that were undone

    // Initialize fabric canvas
    const canvas = new fabric.Canvas('drawingCanvas', {
        width: 800,
        height: 1200,
        isDrawingMode: false,
        backgroundColor: 'rgba(0,0,0,0)'
    });

// Configure brush settings
    function initializeBrush() {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = colorPicker.value;
        canvas.freeDrawingBrush.width = parseInt(brushSize.value, 10);
    }
    initializeBrush();

// event listeners for brush controls
    brushSize.addEventListener('input', function() {
        const size = this.value;
        sizeLabel.textContent = `${size}px`;
        canvas.freeDrawingBrush.width = parseInt(size, 10);
    });

    colorPicker.addEventListener('input', function() {
        canvas.freeDrawingBrush.color = this.value;
    });

    // Message display functions
    function showError(message) {
        errorMessage.style.display = message ? 'block' : 'none';
        errorMessage.textContent = message;
        loadingMessage.style.display = 'none';
    }

    function showLoading(message) {
        loadingMessage.style.display = message ? 'block' : 'none';
        loadingMessage.textContent = message;
        errorMessage.style.display = 'none';
    }

    // Drawing state management
    function saveCurrentPageDrawings() {
        if (currentPage) {
            drawingStates.set(currentPage, canvas.toJSON());
        }
    }

    function loadPageDrawings(pageNumber) {
        const drawings = drawingStates.get(pageNumber);
        if (drawings) {
            canvas.loadFromJSON(drawings, canvas.renderAll.bind(canvas));
        } else {
            canvas.clear();
            canvas.backgroundColor = 'rgba(0,0,0,0)';
        }
    }

function updatePageInfo() {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}


//Zoom in-out functionality
    increaseBtn?.addEventListener('click', ()=>{
        if (!currentPDF) {
        showError('Please upload a PDF first.');
        return;
    }
        scale = scale + 0.1;
        renderPage(currentPage);
    })
    decreaseBtn?.addEventListener('click', ()=>{
        if (!currentPDF) {
        showError('Please upload a PDF first.');
        return;
    }
        scale = scale - 0.1;
        renderPage(currentPage);
    })


    // Download functionality
    downloadBtn.addEventListener('click', async () => {
    try {
        if (!currentPDF) {
            showError('Please upload a PDF first.');
            return;
        }

        showLoading('Preparing PDF for download...');
        
        // Save current page drawings before processing
        saveCurrentPageDrawings();
        
        // Get the original PDF data
        const existingPdfBytes = await currentPDF.getData();
        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
        
        // Current page backup
        const currentPageBackup = currentPage;
        
        // Process each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            // Set up canvas for current page
            currentPage = pageNum;
            await renderPage(pageNum);
            loadPageDrawings(pageNum);
            
            // Get page drawings as image
            const drawingDataUrl = canvas.toDataURL('image/png');
            const drawingImage = await pdfDoc.embedPng(drawingDataUrl);
            
            // Add drawings to PDF page
            const pdfPage = pdfDoc.getPage(pageNum - 1);
            pdfPage.drawImage(drawingImage, {
                x: 0,
                y: 0,
                width: pdfPage.getWidth(),
                height: pdfPage.getHeight()
            });
        }
        
        // Generate PDF with drawings
        const pdfBytes = await pdfDoc.save();
        
        // Create download link
        const originalFileName = pdfInput.files[0].name;
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Modified-${originalFileName}`;
        link.click();
        
        // Restore original page view
        currentPage = currentPageBackup;
        await renderPage(currentPage);
        loadPageDrawings(currentPage);
        
        showLoading('');
    } catch (error) {
        showError('Failed to download: ' + error.message);
        console.error(error);
    }
});

// Tool buttons functionality
    const pdfInput = document.getElementById('pdfInput');
    const drawBtn = document.getElementById('drawBtn');
    const selectBtn = document.getElementById('selectBtn');
    const redoBtn = document.getElementById('redoBtn');
    const clearBtn = document.getElementById('clearBtn');

    drawBtn?.addEventListener('click', () => {
        if (!currentPDF) {
        showError('Please upload a PDF first.');
        return;
    }
        canvas.isDrawingMode = true;
        canvas.selection = true;
        drawBtn.classList.add('active');
        selectBtn.classList.remove('active');
        colorPicker.disabled = false;
        brushSize.disabled = false;
    });

    selectBtn?.addEventListener('click', () => {
        if (!currentPDF) {
        showError('Please upload a PDF first.');
        return;
    }
        canvas.isDrawingMode = false;
        canvas.selection = true;
        selectBtn.classList.add('active');
        drawBtn.classList.remove('active');
        colorPicker.disabled = true;
        brushSize.disabled = true;
    });

    clearBtn?.addEventListener('click', () => {
        if (!currentPDF) {
        showError('Please upload a PDF first.');
        return;
    }
        if (confirm('Are you sure you want to clear all annotations on this page?')) {
            canvas.clear();
            canvas.backgroundColor = 'rgba(0,0,0,0)';
            drawingStates.delete(currentPage);
        }
    });
    
    
// Undo button
undoBtn?.addEventListener('click', () => {
    if (!currentPDF) {
        showError('Please upload a PDF first.');
        return;
    }
    
    const objects = canvas.getObjects();
    if (objects.length > 0) {

        // Initialize redo stack for current page if it doesn't exist
        if (!redoStack.has(currentPage)) {
            redoStack.set(currentPage, []);
        }
        
        // Remove and store the last object for redo
        const lastObject = objects[objects.length - 1];
        canvas.remove(lastObject);
        redoStack.get(currentPage).push(lastObject);
        
        canvas.renderAll();
        saveCurrentPageDrawings();
    }
});

// Redo button
redoBtn?.addEventListener('click', () => {
    if (!currentPDF) {
        showError('Please upload a PDF first.');
        return;
    }
    
    const pageRedoStack = redoStack.get(currentPage);
    if (pageRedoStack && pageRedoStack.length > 0) {
        // Get and restore the last undone object
        const objectToRedo = pageRedoStack.pop();
        canvas.add(objectToRedo);
        canvas.renderAll();
        saveCurrentPageDrawings();
    }
});


// // the clear button (as undo)
// clearBtn?.addEventListener('click', () => {
//     if (!currentPDF) {
//         showError('Please upload a PDF first.');
//         return;
//     }
    
//     const objects = canvas.getObjects();
//     if (objects.length > 0) {
//         // Remove only the last drawn object
//         const lastObject = objects[objects.length - 1];
//         canvas.remove(lastObject);
        
//         // Store the removed object for potential redo
//         if (!undoStack.has(currentPage)) {
//             undoStack.set(currentPage, []);
//         }
//         undoStack.get(currentPage).push(lastObject);
        
//         canvas.renderAll();
//         saveCurrentPageDrawings();
//     }
// });


// Update the page navigation to handle undo/redo stacks
function updatePageState() {
    // Clear undo/redo stacks when changing pages
    if (!undoStack.has(currentPage)) {
        undoStack.set(currentPage, []);
    }
}

//prevPageBtn and nextPageBtn click handlers
prevPageBtn.addEventListener('click', async () => {
    if (currentPage > 1) {
        saveCurrentPageDrawings();
        currentPage--;
        await renderPage(currentPage);
        loadPageDrawings(currentPage);
        updatePageInfo();
        updatePageState(); 
    }
});

nextPageBtn.addEventListener('click', async () => {
    if (currentPage < totalPages) {
        saveCurrentPageDrawings();
        currentPage++;
        await renderPage(currentPage);
        loadPageDrawings(currentPage);
        updatePageInfo();
        updatePageState(); 
    }
});

 // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(async function() {
                if (currentPDF) {
                    await renderPage(currentPage);
                    loadPageDrawings(currentPage);
                }
            }, 250);
        });

    // PDF rendering functions
    async function renderPage(pageNumber) {
        try {
            showLoading(`Rendering page ${pageNumber}...`);
            canvas.isDrawingMode = true;
            drawBtn.click();
            const page = await currentPDF.getPage(pageNumber);
            const pixelRatio = window.devicePixelRatio || 1;
            const viewport = page.getViewport({ scale: scale });
    

     // Set canvas dimensions
            const displayWidth = viewport.width;
            const displayHeight = viewport.height;
            
            pdfCanvas.width = Math.floor(displayWidth * pixelRatio);
            pdfCanvas.height = Math.floor(displayHeight * pixelRatio);
            
            pdfCanvas.style.width = `${displayWidth}px`;
            pdfCanvas.style.height = `${displayHeight}px`;
            
            pdfContext.scale(pixelRatio, pixelRatio);
            
    // Update wrapper and drawing canvas dimensions
            canvasWrapper.style.width = `${displayWidth}px`;
            canvasWrapper.style.height = `${displayHeight}px`;
            
            canvas.setDimensions({
                width: displayWidth,
                height: displayHeight
            });

    // Render PDF page
            await page.render({
                canvasContext: pdfContext,  //2D
                viewport: viewport
            }).promise;

            showLoading('');
            return true;
        } catch (error) {
            showError('Failed to render page: ' + error.message);
            return false;
        }
    }

    async function loadPDF(pdfData) {
        try {
            showLoading('Loading PDF...');
            
            const loadingTask = pdfjsLib.getDocument(pdfData);
            currentPDF = await loadingTask.promise;
            totalPages = currentPDF.numPages;
            currentPage = 1;
            
            drawingStates.clear();
            await renderPage(currentPage);
            updatePageInfo();

            showLoading('');
            return true;
        } catch (error) {
            showError('Failed to load PDF: ' + error.message);
            return false;
        }
    }

    // File input handler
    pdfInput?.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                showError('Please select a valid PDF file.');
                return;
            }
            try {
                const arrayBuffer = await file.arrayBuffer();
                await loadPDF(arrayBuffer);
            } catch (error) {
                showError('Error reading file: ' + error.message);
            }
        }
    });

    // Set initial mode to draw
    // drawBtn.click();

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName !== 'INPUT') {  
            if (e.key === 'd') drawBtn.click();
            if (e.key === 's') selectBtn.click();
            if (e.key === 'c') clearBtn.click();
            if (e.key === 'ArrowLeft') prevPageBtn.click();
            if (e.key === 'ArrowRight') nextPageBtn.click();
        }
    });

