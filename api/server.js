// api/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const SheetsDB = require('./sheets-db');

const app = express();
app.use(cors());
app.use(express.json());

const db = new SheetsDB('1SfoCefyVpqnjykWVLQGkfavWV45fQJ6StTNwGcKmw7g');

// ========== ATENCIÓN: ELIMINAMOS express.static POR COMPLETO ==========
// Vercel servirá archivos estáticos directamente (CSS, JS, imágenes)
// Solo manejamos explícitamente las rutas HTML y API

// ========== Rutas EXPLÍCITAS para HTML (prioridad alta) ==========
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'), (err) => {
    if (err) {
      console.error('❌ Error sirviendo index.html:', err.message);
      res.status(404).json({ error: 'index.html no encontrado en el servidor' });
    }
  });
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'), (err) => {
    if (err) {
      console.error('❌ Error sirviendo index.html:', err.message);
      res.status(404).json({ error: 'index.html no encontrado en el servidor' });
    }
  });
});

app.get('/proyectos.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'proyectos.html'), (err) => {
    if (err) {
      console.error('❌ Error sirviendo proyectos.html:', err.message);
      res.status(404).json({ error: 'proyectos.html no encontrado' });
    }
  });
});

app.get('/cultura.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'cultura.html'), (err) => {
    if (err) {
      console.error('❌ Error sirviendo cultura.html:', err.message);
      res.status(404).json({ error: 'cultura.html no encontrado' });
    }
  });
});

app.get('/catalogo.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'catalogo.html'), (err) => {
    if (err) {
      console.error('❌ Error sirviendo catalogo.html:', err.message);
      res.status(404).json({ error: 'catalogo.html no encontrado' });
    }
  });
});

app.get('/producto.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'producto.html'), (err) => {
    if (err) {
      console.error('❌ Error sirviendo producto.html:', err.message);
      res.status(404).json({ error: 'producto.html no encontrado' });
    }
  });
});

app.get('/productoText.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'productoText.html'), (err) => {
    if (err) {
      console.error('❌ Error sirviendo productoText.html:', err.message);
      res.status(404).json({ error: 'productoText.html no encontrado' });
    }
  });
});

app.get('/testcss.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'testcss.html'), (err) => {
    if (err) {
      console.error('❌ Error sirviendo testcss.html:', err.message);
      res.status(404).json({ error: 'testcss.html no encontrado' });
    }
  });
});

// ========== 🔧 ENDPOINT DE DEBUG (SIN CAMBIOS) ==========
app.get('/api/debug', async (req, res) => {
  try {
    const envCheck = {
      SERVICE_ACCOUNT_JSON: !!process.env.SERVICE_ACCOUNT_JSON,
      GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_PRIVATE_KEY_length: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0,
      GOOGLE_CLIENT_EMAIL_value: process.env.GOOGLE_CLIENT_EMAIL || 'NO CONFIGURADO',
      NODE_ENV: process.env.NODE_ENV || 'development'
    };

    const connectionTest = await db.testConnection();

    let sampleData = null;
    let sampleError = null;
    try {
      const artesanos = await db.getAll('artesanos');
      sampleData = {
        totalArtesanos: artesanos.length,
        primerArtesano: artesanos[0] || null
      };
    } catch (err) {
      sampleError = err.message;
    }

    res.json({
      status: 'DEBUG MODE - TODO OK',
      timestamp: new Date().toISOString(),
      environment: {
        ...envCheck
      },
      googleSheetsConnection: connectionTest,
      dataTest: sampleData,
      dataTestError: sampleError,
      warnings: [
        '⚠️ ELIMINA ESTE ENDPOINT /api/debug ANTES DE PRODUCCIÓN',
        'Frontend ahora servido 100% por Vercel'
      ]
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== ENDPOINTS DE API (SIN CAMBIOS) ==========
// ... (MANTÉN TODOS TUS ENDPOINTS DE API EXACTAMENTE IGUALES)
// (No los repito aquí para ahorrar espacio, pero DEBEN QUEDAR IGUALES)
app.get('/api/artesanos', async (req, res) => { /* ... */ });
app.get('/api/artesanos/:id', async (req, res) => { /* ... */ });
// ... (todos los demás endpoints)

// ========== HEALTH CHECK (SIN CAMBIOS) ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      artesanos: '/api/artesanos',
      productos: '/api/productos',
      proyectos: '/api/proyectos',
      voluntarios: '/api/voluntarios',
      articulosBlog: '/api/articulosBlog',
      consultas_POST: '/api/consultas',
      consultas_GET: '/api/consultas',
      informes: '/api/informes',
      debug: '/api/debug (⚠️ TEMPORAL)'
    }
  });
});

// ========== 404 MANEJADO POR NOSOTROS (IMPORTANTE) ==========
app.use((req, res) => {
  // Solo llegamos aquí si ninguna ruta anterior coincidió
  res.status(404).json({ 
    error: 'Endpoint no encontrado',
    requestedUrl: req.originalUrl,
    availableEndpoints: [
      '/',
      '/proyectos.html',
      '/cultura.html',
      '/catalogo.html',
      '/producto.html',
      '/productoText.html',
      '/testcss.html',
      '/api/artesanos',
      '/api/artesanos/:id',
      '/api/proyectos',
      '/api/voluntarios',
      '/api/articulosBlog',
      '/api/productos',
      '/api/productos/:id',
      '/api/productos/categoria/:categoria',
      '/api/consultas',
      '/api/informes',
      '/api/debug',
      '/health'
    ]
  });
});

// ========== INICIO DEL SERVIDOR (SIN CAMBIOS) ==========
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor PATAC corriendo en http://localhost:${PORT}`);
    console.log(`🔍 Debug endpoint: http://localhost:${PORT}/api/debug`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Productos: http://localhost:${PORT}/api/productos`);
    console.log(`👥 Artesanos: http://localhost:${PORT}/api/artesanos`);
  });
}

module.exports = app;