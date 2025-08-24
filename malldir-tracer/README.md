# Mall Directory Tracer - Python Version

A GUI application for tracing contours from mall directory images using OpenCV and Tkinter.

## Features

- **Image Loading**: Load images from files or paste from clipboard
- **Real-time Processing**: Multi-threaded image processing with progress indicators
- **Parameter Control**: Adjustable Canny edge detection, contour approximation, and filtering
- **Binarization**: Optional GPU-accelerated binarization with morphological operations
- **Visual Feedback**: Live contour overlay on processed images
- **SVG Export**: Export traced contours as scalable vector graphics

## Requirements

- Python 3.8+
- OpenCV (cv2)
- NumPy
- Pillow (PIL)
- Tkinter (usually included with Python)

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python main.py
```

## Usage

1. **Load Image**: Click "Load Image" to select a file, or "Paste from Clipboard" to use copied images
2. **Adjust Parameters**: Use the sliders to fine-tune edge detection and contour filtering
3. **Trace Contours**: Click "Trace Contours" to process the image
4. **Export Results**: Save the traced contours as an SVG file

## Parameters

- **Canny T1/T2**: Edge detection thresholds (lower = more edges)
- **Approx Epsilon**: Polygon approximation accuracy (higher = simpler shapes)  
- **Min Area**: Minimum contour area to include
- **Max Dimension**: Maximum image dimension for processing (larger = slower but more detailed)
- **Binarize**: Convert to black/white before edge detection
- **Morph Kernel**: Size of morphological operations for noise reduction

## Advantages over Web Version

- **No blocking**: Multi-threaded processing keeps UI responsive
- **Native performance**: Direct OpenCV integration without WASM overhead
- **Reliable**: No web worker or browser compatibility issues
- **Clipboard support**: Direct paste from system clipboard
- **Better memory management**: Efficient handling of large images

## Architecture

- **Main Thread**: UI and user interaction
- **Background Thread**: Image processing and OpenCV operations
- **Thread-safe Updates**: Progress updates via Tkinter's `after()` method
- **Scalable Processing**: Automatic image downscaling for performance
