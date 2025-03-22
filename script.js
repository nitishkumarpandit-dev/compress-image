const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const settings = document.getElementById('settings');
const previewImage = document.getElementById('previewImage');
const originalSizeSpan = document.getElementById('originalSize');
const compressedSizeSpan = document.getElementById('compressedSize');
const compressBtn = document.getElementById('compressBtn');
const downloadBtn = document.getElementById('downloadBtn');
const compressionMode = document.getElementById('compressionMode');
const compressionLevel = document.getElementById('compressionLevel');
const qualityOptions = document.getElementById('qualityOptions');
const sizeOptions = document.getElementById('sizeOptions');
const targetSize = document.getElementById('targetSize');
const sizeUnit = document.getElementById('sizeUnit');
const previewContainer = document.getElementById('previewContainer');
const originalPreview = document.getElementById('originalPreview');
const compressedPreview = document.getElementById('compressedPreview');
const originalSizeCell = document.getElementById('originalSizeCell');
const compressedSizeCell = document.getElementById('compressedSizeCell');
const sizeDiff = document.getElementById('sizeDiff');
const originalDimensions = document.getElementById('originalDimensions');
const compressedDimensions = document.getElementById('compressedDimensions');
const dimensionsDiff = document.getElementById('dimensionsDiff');
const originalFormat = document.getElementById('originalFormat');
const compressedFormat = document.getElementById('compressedFormat');
const formatDiff = document.getElementById('formatDiff');
const originalQuality = document.getElementById('originalQuality');
const compressedQuality = document.getElementById('compressedQuality');
const qualityDiff = document.getElementById('qualityDiff');
const resetZoom = document.getElementById('resetZoom');
const zoomIn = document.getElementById('zoomIn');

let currentZoom = 1;
let originalFile = null;
let zoomButtonsVisible = false;

// Handle click to upload
dropZone.addEventListener('click', () => fileInput.click());

// Handle file selection
fileInput.addEventListener('change', handleFileSelect);

// Handle drag and drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    const files = e.dataTransfer.files;
    if (files.length) {
        fileInput.files = files;
        handleFileSelect({ target: fileInput });
    }
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (!validImageTypes.includes(file.type)) {
        alert('Please upload an image file (JPEG, PNG, GIF, WebP, or BMP)');
        e.target.value = '';
        return;
    }

    originalFile = file;
    const reader = new FileReader();

    reader.onload = function (event) {
        previewImage.src = event.target.result;
        originalPreview.src = event.target.result;
        settings.style.display = 'block';
        previewContainer.style.display = 'none';
        originalSizeSpan.textContent = formatSize(file.size);
        compressedSizeSpan.textContent = '0 KB';
        downloadBtn.style.display = 'none';

        const img = new Image();
        img.src = event.target.result;
        img.onload = function () {
            originalDimensions.textContent = `${img.width}x${img.height}`;
            originalFormat.textContent = file.type.split('/')[1].toUpperCase();
            originalQuality.textContent = '100%';
            originalSizeCell.textContent = formatSize(file.size);
        };
    };

    reader.readAsDataURL(file);
}

compressBtn.addEventListener('click', compressImage);

compressionMode.addEventListener('change', function () {
    qualityOptions.style.display = this.value === 'quality' ? 'block' : 'none';
    sizeOptions.style.display = this.value === 'size' ? 'block' : 'none';
});

async function compressImage() {
    const img = new Image();
    img.src = previewImage.src;

    await new Promise((resolve) => {
        img.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Calculate new dimensions while maintaining aspect ratio
    const maxWidth = 1920;
    const maxHeight = 1080;
    let width = img.width;
    let height = img.height;

    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    if (compressionMode.value === 'quality') {
        // Quality-based compression
        const quality = parseFloat(compressionLevel.value);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        updateCompressedImage(blob);
    } else {
        // Size-based compression
        const targetBytes = calculateTargetBytes();
        if (!targetBytes) return;

        let low = 0.01;
        let high = 1.0;
        let bestBlob = null;
        let bestQuality = 0;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            attempts++;
            const quality = (low + high) / 2;
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));

            if (Math.abs(blob.size - targetBytes) / targetBytes < 0.1) {
                bestBlob = blob;
                break;
            }

            if (blob.size > targetBytes) {
                high = quality;
            } else {
                if (!bestBlob || Math.abs(blob.size - targetBytes) < Math.abs(bestBlob.size - targetBytes)) {
                    bestBlob = blob;
                    bestQuality = quality;
                }
                low = quality;
            }
        }

        if (bestBlob) {
            updateCompressedImage(bestBlob);
        }
    }
}

function calculateTargetBytes() {
    const size = parseFloat(targetSize.value);
    if (isNaN(size) || size <= 0) {
        alert('Please enter a valid target size');
        return null;
    }
    const multiplier = sizeUnit.value === 'MB' ? 1024 * 1024 : 1024;
    return Math.floor(size * multiplier);
}

function updateCompressedImage(blob) {
    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function () {
            compressedPreview.src = event.target.result;
            compressedSizeSpan.textContent = formatSize(blob.size);
            compressedDimensions.textContent = `${img.width}x${img.height}`;
            compressedFormat.textContent = 'JPEG';
            compressedQuality.textContent = `${Math.round(compressionLevel.value * 100)}%`;
            compressedSizeCell.textContent = formatSize(blob.size);

            // Calculate differences
            const sizeDifference = originalFile.size - blob.size;
            sizeDiff.textContent = `${formatSize(Math.abs(sizeDifference))} ${sizeDifference > 0 ? 'smaller' : 'larger'}`;
            dimensionsDiff.textContent = originalDimensions.textContent === compressedDimensions.textContent ? 'No change' : 'Changed';
            formatDiff.textContent = originalFormat.textContent === compressedFormat.textContent ? 'No change' : 'Converted';
            qualityDiff.textContent = `${Math.round((1 - compressionLevel.value) * 100)}% reduced`;

            previewContainer.style.display = 'block';
            downloadBtn.href = URL.createObjectURL(blob);
            downloadBtn.download = `compressed_${originalFile.name}`;
            downloadBtn.style.display = 'block';
        };
    };
    reader.readAsDataURL(blob);
}

// Zoom functionality
resetZoom.addEventListener('click', () => {
    currentZoom = 1;
    applyZoom();
    updateZoomButtonsPosition();
});

zoomIn.addEventListener('click', () => {
    currentZoom *= 1.2;
    applyZoom();
    updateZoomButtonsPosition();
});

function applyZoom() {
    compressedPreview.style.transform = `scale(${currentZoom})`;
    compressedPreview.style.transformOrigin = 'center center';
    compressedPreview.style.transition = 'transform 0.3s ease';
}

function updateZoomButtonsPosition() {
    const previewControls = document.querySelector('.preview-controls');
    if (currentZoom > 1) {
        previewControls.style.position = 'fixed';
        previewControls.style.top = '20px';
        previewControls.style.right = '20px';
        previewControls.style.zIndex = '1000';
        previewControls.style.background = 'rgba(255, 255, 255, 0.9)';
        previewControls.style.padding = '10px';
        previewControls.style.borderRadius = '8px';
        previewControls.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    } else {
        previewControls.style.position = 'static';
        previewControls.style.background = 'none';
        previewControls.style.boxShadow = 'none';
    }
}

function formatSize(bytes) {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}