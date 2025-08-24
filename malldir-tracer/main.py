#!/usr/bin/env python3
"""
Mall Directory Tracer - Python Version
A GUI application for tracing contours from mall directory images.
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import cv2
import numpy as np
from PIL import Image, ImageTk
import threading
import time


class MallDirectoryTracer:
    def __init__(self, root):
        self.root = root
        self.root.title("Mall Directory Tracer")
        self.root.geometry("1200x800")
        
        # State variables
        self.original_image = None
        self.processed_image = None
        self.contours = []
        self.current_scale = 1.0
        self.is_processing = False
        
        # Parameters
        self.params = {
            'canny_threshold1': tk.IntVar(value=70),
            'canny_threshold2': tk.IntVar(value=140),
            'approx_epsilon': tk.DoubleVar(value=4.0),
            'min_area': tk.IntVar(value=1200),
            'max_dimension': tk.IntVar(value=1400),
            'binarize': tk.BooleanVar(value=True),
            'invert_binary': tk.BooleanVar(value=False),
            'morph_kernel': tk.IntVar(value=3)
        }
        
        self.setup_ui()
        
    def setup_ui(self):
        """Create the user interface"""
        # Main container
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Left panel for controls
        control_frame = ttk.Frame(main_frame)
        control_frame.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        
        # Right panel for image display
        image_frame = ttk.Frame(main_frame)
        image_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        self.setup_controls(control_frame)
        self.setup_image_display(image_frame)
        
    def setup_controls(self, parent):
        """Setup the control panel"""
        # File operations
        file_frame = ttk.LabelFrame(parent, text="File Operations", padding=10)
        file_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Button(file_frame, text="Load Image", 
                  command=self.load_image).pack(fill=tk.X, pady=2)
        ttk.Button(file_frame, text="Paste from Clipboard", 
                  command=self.paste_image).pack(fill=tk.X, pady=2)
        
        # Processing controls
        process_frame = ttk.LabelFrame(parent, text="Processing", padding=10)
        process_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.trace_button = ttk.Button(process_frame, text="Trace Contours", 
                                      command=self.start_trace)
        self.trace_button.pack(fill=tk.X, pady=2)
        
        self.progress_var = tk.StringVar(value="Ready")
        self.progress_label = ttk.Label(process_frame, textvariable=self.progress_var)
        self.progress_label.pack(fill=tk.X, pady=2)
        
        self.progress_bar = ttk.Progressbar(process_frame, mode='indeterminate')
        self.progress_bar.pack(fill=tk.X, pady=2)
        
        # Parameter controls
        param_frame = ttk.LabelFrame(parent, text="Parameters", padding=10)
        param_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Canny thresholds
        self.create_slider(param_frame, "Canny T1", self.params['canny_threshold1'], 0, 255)
        self.create_slider(param_frame, "Canny T2", self.params['canny_threshold2'], 0, 255)
        self.create_slider(param_frame, "Approx Epsilon", self.params['approx_epsilon'], 0, 20, resolution=0.5)
        self.create_slider(param_frame, "Min Area", self.params['min_area'], 0, 5000, resolution=10)
        self.create_slider(param_frame, "Max Dimension", self.params['max_dimension'], 800, 4000, resolution=100)
        
        # Checkboxes
        ttk.Checkbutton(param_frame, text="Binarize", 
                       variable=self.params['binarize']).pack(anchor=tk.W, pady=2)
        ttk.Checkbutton(param_frame, text="Invert Binary", 
                       variable=self.params['invert_binary']).pack(anchor=tk.W, pady=2)
        
        self.create_slider(param_frame, "Morph Kernel", self.params['morph_kernel'], 0, 7)
        
        # Results
        results_frame = ttk.LabelFrame(parent, text="Results", padding=10)
        results_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.results_var = tk.StringVar(value="No contours found")
        ttk.Label(results_frame, textvariable=self.results_var).pack(anchor=tk.W)
        
        ttk.Button(results_frame, text="Export SVG", 
                  command=self.export_svg).pack(fill=tk.X, pady=2)
        
    def create_slider(self, parent, label, variable, from_, to, resolution=1):
        """Create a labeled slider"""
        frame = ttk.Frame(parent)
        frame.pack(fill=tk.X, pady=2)
        
        ttk.Label(frame, text=label).pack(anchor=tk.W)
        scale = ttk.Scale(frame, from_=from_, to=to, variable=variable, 
                         orient=tk.HORIZONTAL)
        scale.pack(fill=tk.X)
        
        # Value label
        value_label = ttk.Label(frame, text=str(variable.get()))
        value_label.pack(anchor=tk.E)
        
        def update_label(*args):
            value_label.config(text=f"{variable.get():.1f}")
        variable.trace('w', update_label)
        
    def setup_image_display(self, parent):
        """Setup the image display area"""
        # Canvas with scrollbars
        canvas_frame = ttk.Frame(parent)
        canvas_frame.pack(fill=tk.BOTH, expand=True)
        
        self.canvas = tk.Canvas(canvas_frame, bg='white')
        
        # Scrollbars
        v_scrollbar = ttk.Scrollbar(canvas_frame, orient=tk.VERTICAL, command=self.canvas.yview)
        h_scrollbar = ttk.Scrollbar(canvas_frame, orient=tk.HORIZONTAL, command=self.canvas.xview)
        
        self.canvas.configure(yscrollcommand=v_scrollbar.set, xscrollcommand=h_scrollbar.set)
        
        # Pack scrollbars and canvas
        v_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        h_scrollbar.pack(side=tk.BOTTOM, fill=tk.X)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
    def load_image(self):
        """Load image from file"""
        file_path = filedialog.askopenfilename(
            title="Select Image",
            filetypes=[
                ("Image files", "*.png *.jpg *.jpeg *.bmp *.tiff *.webp"),
                ("All files", "*.*")
            ]
        )
        
        if file_path:
            try:
                self.original_image = cv2.imread(file_path)
                if self.original_image is None:
                    messagebox.showerror("Error", "Could not load image")
                    return
                    
                self.display_image(self.original_image)
                self.progress_var.set(f"Loaded: {file_path}")
                
            except Exception as e:
                messagebox.showerror("Error", f"Failed to load image: {e}")
                
    def paste_image(self):
        """Paste image from clipboard"""
        try:
            from PIL import ImageGrab
            pil_image = ImageGrab.grabclipboard()
            
            if pil_image is None:
                messagebox.showwarning("Warning", "No image found in clipboard")
                return
                
            # Convert PIL to OpenCV
            self.original_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            self.display_image(self.original_image)
            self.progress_var.set("Pasted from clipboard")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to paste image: {e}")
            
    def display_image(self, cv_image):
        """Display OpenCV image on canvas"""
        if cv_image is None:
            return
            
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
        
        # Convert to PIL Image
        pil_image = Image.fromarray(rgb_image)
        
        # Scale if too large
        max_display_size = 800
        if max(pil_image.size) > max_display_size:
            ratio = max_display_size / max(pil_image.size)
            new_size = (int(pil_image.width * ratio), int(pil_image.height * ratio))
            pil_image = pil_image.resize(new_size, Image.Resampling.LANCZOS)
            self.current_scale = ratio
        else:
            self.current_scale = 1.0
            
        # Convert to PhotoImage
        self.photo = ImageTk.PhotoImage(pil_image)
        
        # Clear canvas and display image
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, anchor=tk.NW, image=self.photo)
        
        # Update scroll region
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        
    def start_trace(self):
        """Start tracing in a separate thread"""
        if self.original_image is None:
            messagebox.showwarning("Warning", "Please load an image first")
            return
            
        if self.is_processing:
            return
            
        self.is_processing = True
        self.trace_button.config(state='disabled')
        self.progress_bar.start()
        
        # Start processing in background thread
        thread = threading.Thread(target=self.trace_contours)
        thread.daemon = True
        thread.start()
        
    def trace_contours(self):
        """Process image and find contours"""
        try:
            self.update_progress("Starting trace...")
            
            # Get parameters
            max_dim = self.params['max_dimension'].get()
            canny_t1 = self.params['canny_threshold1'].get()
            canny_t2 = self.params['canny_threshold2'].get()
            approx_eps = self.params['approx_epsilon'].get()
            min_area = self.params['min_area'].get()
            binarize = self.params['binarize'].get()
            invert = self.params['invert_binary'].get()
            morph_kernel = self.params['morph_kernel'].get()
            
            # Downscale image
            self.update_progress("Downscaling image...")
            img = self.original_image.copy()
            h, w = img.shape[:2]
            scale = min(1.0, max_dim / max(w, h))
            
            if scale < 1.0:
                new_w, new_h = int(w * scale), int(h * scale)
                img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
                
            # Process image
            if binarize:
                self.update_progress("Binarizing image...")
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                
                # Apply threshold
                _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                
                if invert:
                    binary = cv2.bitwise_not(binary)
                    
                # Apply morphology if requested
                if morph_kernel > 0:
                    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (morph_kernel, morph_kernel))
                    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
                    
                processed = binary
            else:
                self.update_progress("Converting to grayscale...")
                processed = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                processed = cv2.GaussianBlur(processed, (3, 3), 0)
                
            # Edge detection
            self.update_progress("Detecting edges...")
            edges = cv2.Canny(processed, canny_t1, canny_t2)
            
            # Find contours
            self.update_progress("Finding contours...")
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Process contours
            self.update_progress("Processing contours...")
            filtered_contours = []
            
            for i, contour in enumerate(contours):
                # Approximate polygon
                epsilon = approx_eps * cv2.arcLength(contour, True) / 100.0
                approx = cv2.approxPolyDP(contour, epsilon, True)
                
                # Filter by area and vertex count
                area = cv2.contourArea(contour)
                if area >= min_area and len(approx) >= 3:
                    # Scale back to original coordinates
                    scaled_contour = approx / scale
                    filtered_contours.append({
                        'id': f'contour_{i}',
                        'points': scaled_contour.reshape(-1, 2).tolist(),
                        'area': area / (scale * scale)  # Scale area back too
                    })
                    
            self.contours = filtered_contours
            
            # Update UI in main thread
            self.root.after(0, self.finish_processing)
            
        except Exception as e:
            self.root.after(0, lambda: self.handle_error(str(e)))
            
    def update_progress(self, message):
        """Update progress message (thread-safe)"""
        self.root.after(0, lambda: self.progress_var.set(message))
        
    def finish_processing(self):
        """Finish processing and update UI"""
        self.is_processing = False
        self.trace_button.config(state='normal')
        self.progress_bar.stop()
        
        count = len(self.contours)
        self.progress_var.set(f"Found {count} contours")
        self.results_var.set(f"Found {count} contours")
        
        # Draw contours on image
        if self.original_image is not None and self.contours:
            self.draw_contours()
            
    def handle_error(self, error_message):
        """Handle processing error"""
        self.is_processing = False
        self.trace_button.config(state='normal')
        self.progress_bar.stop()
        self.progress_var.set("Error occurred")
        messagebox.showerror("Processing Error", error_message)
        
    def draw_contours(self):
        """Draw contours on the displayed image"""
        if not self.contours or self.original_image is None:
            return
            
        # Create image with contours
        display_img = self.original_image.copy()
        
        for contour_data in self.contours:
            points = np.array(contour_data['points'], dtype=np.int32)
            cv2.polylines(display_img, [points], True, (0, 255, 0), 2)
            
        self.display_image(display_img)
        
    def export_svg(self):
        """Export contours as SVG"""
        if not self.contours:
            messagebox.showwarning("Warning", "No contours to export")
            return
            
        file_path = filedialog.asksaveasfilename(
            title="Save SVG",
            defaultextension=".svg",
            filetypes=[("SVG files", "*.svg"), ("All files", "*.*")]
        )
        
        if file_path:
            try:
                self.write_svg(file_path)
                messagebox.showinfo("Success", f"SVG exported to {file_path}")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to export SVG: {e}")
                
    def write_svg(self, file_path):
        """Write contours to SVG file"""
        if self.original_image is None:
            return
            
        h, w = self.original_image.shape[:2]
        
        with open(file_path, 'w') as f:
            f.write(f'<?xml version="1.0" encoding="UTF-8"?>\n')
            f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">\n')
            
            for contour_data in self.contours:
                points = contour_data['points']
                path_data = f"M {points[0][0]},{points[0][1]}"
                
                for point in points[1:]:
                    path_data += f" L {point[0]},{point[1]}"
                    
                path_data += " Z"
                
                f.write(f'  <path d="{path_data}" fill="none" stroke="green" stroke-width="2" />\n')
                
            f.write('</svg>\n')


def main():
    root = tk.Tk()
    app = MallDirectoryTracer(root)
    root.mainloop()


if __name__ == "__main__":
    main()
