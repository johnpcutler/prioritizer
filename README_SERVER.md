# Running the Application

## ES6 Modules Requirement

This application uses ES6 modules, which require an HTTP server to run (not `file://` protocol).

## Quick Start

### Option 1: Python HTTP Server (Recommended)

```bash
python3 server.py
```

Then open: http://localhost:8000

### Option 2: Python One-Liner

```bash
python3 -m http.server 8000
```

Then open: http://localhost:8000

### Option 3: Node.js http-server

If you have Node.js installed:

```bash
npx http-server -p 8000
```

Then open: http://localhost:8000

### Option 4: VS Code Live Server

If using VS Code, install the "Live Server" extension and click "Go Live" in the status bar.

## Why?

ES6 modules are subject to CORS (Cross-Origin Resource Sharing) restrictions. Browsers block `file://` protocol requests for security reasons. An HTTP server is required to serve the modules properly.



