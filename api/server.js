// api/server.js - VERSIÓN DEFINITIVA CON SERVICIO DE ARCHIVOS ESTÁTICOS
const express = require('express');
const cors = require('cors');
const path = require('path');
const SheetsDB = require('./sheets-db');

const app = express();
app.use(cors());
app.use(express.json());

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SPREADSHEET_ID = '1SfoCefyVpqnjykWVLQGkfavWV45fQJ6StTNwGcKmw7g';
const db = new SheetsDB(SPREADSHEET_ID);

// ========== 🌐 SERVIR ARCHIVOS ESTÁTICOS (SIEMPRE) ==========
console.log(`📁 Configurando directorio público: ${PUBLIC_DIR}`);
app.use(express.static(PUBLIC_DIR, {
  dotfiles: 'ignore',
  etag: true,
  extensions: ['html', 'htm'],
  index: 'index.html',
  maxAge: '1d',
  redirect: true,
  setHeaders: (res, path) => {
    res.set('X-Served-By', 'PATAC-API');
  }
}));

// 🔍 Middleware de logging
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// ========== 🔧 ENDPOINT DE DEBUG ==========
app.get('/api/debug', async (req, res) => {
  const fs = require('fs');
  
  try {
    const envCheck = {
      SERVICE_ACCOUNT_JSON: !!process.env.SERVICE_ACCOUNT_JSON,
      GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_PRIVATE_KEY_length: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0,
      NODE_ENV: process.env.NODE_ENV || 'development',
      isProduction: process.env.NODE_ENV === 'production'
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

    // Verificar archivos en /public
    const publicFiles = fs.existsSync(PUBLIC_DIR) 
      ? fs.readdirSync(PUBLIC_DIR).slice(0, 10) 
      : [];
    
    const indexExists = fs.existsSync(path.join(PUBLIC_DIR, 'index.html'));

    res.json({
      status: '✅ DEBUG MODE - TODO OK',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      googleSheetsConnection: connectionTest,
      dataTest: sampleData,
      dataTestError: sampleError,
      filesystem: {
        publicDir: PUBLIC_DIR,
        publicDirExists: fs.existsSync(PUBLIC_DIR),
        indexHtmlExists: indexExists,
        filesInPublic: publicFiles,
        cwdFiles: fs.existsSync(process.cwd()) ? fs.readdirSync(process.cwd()).slice(0, 10) : []
      },
      warnings: [
        '⚠️ ELIMINA ESTE ENDPOINT /api/debug ANTES DE PRODUCCIÓN',
        'Frontend ahora servido 100% por Vercel (static files)'
      ]
    });
  } catch (error) {
    console.error('❌ Error en /api/debug:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== 📊 ARTESANOS ==========
app.get('/api/artesanos', async (req, res) => {
  try {
    const artesanos = await db.getAll('artesanos');
    res.json({ artesanos });
  } catch (error) {
    console.error('Error en /api/artesanos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/artesanos/:id', async (req, res) => {
  try {
    const artesano = await db.getById(req.params.id, 'artesanos');
    if (!artesano) {
      return res.status(404).json({ error: 'Artesano no encontrado' });
    }
    res.json(artesano);
  } catch (error) {
    console.error('Error en /api/artesanos/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 🎨 PRODUCTOS ==========
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await db.getAll('productos');
    res.json({ productos });
  } catch (error) {
    console.error('Error en /api/productos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/productos/:id', async (req, res) => {
  try {
    const producto = await db.getById(req.params.id, 'productos');
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    console.error('Error en /api/productos/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/productos/categoria/:categoria', async (req, res) => {
  try {
    const productos = await db.getAll('productos');
    const filtrados = productos.filter(p => 
      p.categoria?.toLowerCase() === req.params.categoria.toLowerCase()
    );
    res.json({ productos: filtrados });
  } catch (error) {
    console.error('Error en /api/productos/categoria:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 🚀 PROYECTOS ==========
app.get('/api/proyectos', async (req, res) => {
  try {
    const proyectos = await db.getAll('proyectos');
    res.json({ proyectos });
  } catch (error) {
    console.error('Error en /api/proyectos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/proyectos/:id', async (req, res) => {
  try {
    const proyecto = await db.getById(req.params.id, 'proyectos');
    if (!proyecto) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json(proyecto);
  } catch (error) {
    console.error('Error en /api/proyectos/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 👥 VOLUNTARIOS ==========
app.get('/api/voluntarios', async (req, res) => {
  try {
    const voluntarios = await db.getAll('voluntarios');
    res.json({ voluntarios });
  } catch (error) {
    console.error('Error en /api/voluntarios:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 📝 ARTÍCULOS BLOG ==========
app.get('/api/articulosBlog', async (req, res) => {
  try {
    const articulosBlogs = await db.getAll('articulosBlog');
    res.json({ articulosBlogs });
  } catch (error) {
    console.error('Error en /api/articulosBlog:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 📧 CONSULTAS ==========
app.post('/api/consultas', async (req, res) => {
  try {
    const { clienteNombre, clienteEmail, clienteTelefono, mensaje, productoId } = req.body;
    
    if (!clienteNombre || !clienteEmail || !mensaje) {
      return res.status(400).json({ 
        error: 'Faltan campos obligatorios: clienteNombre, clienteEmail, mensaje' 
      });
    }

    const nuevaConsulta = {
      idConsulta: `CONS-${Date.now()}`,
      clienteNombre,
      clienteEmail,
      clienteTelefono: clienteTelefono || '',
      mensaje,
      productoId: productoId || '',
      fechaConsulta: new Date().toISOString(),
      status: 'pendiente'
    };

    await db.create(nuevaConsulta, 'consultas');
    
    res.status(201).json({ 
      message: 'Consulta enviada correctamente',
      consulta: nuevaConsulta 
    });
  } catch (error) {
    console.error('Error en POST /api/consultas:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/consultas', async (req, res) => {
  try {
    const consultas = await db.getAll('consultas');
    res.json({ consultas });
  } catch (error) {
    console.error('Error en GET /api/consultas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 📊 INFORMES ==========
app.get('/api/informes', async (req, res) => {
  try {
    const informes = await db.getAll('informes');
    res.json({ informes });
  } catch (error) {
    console.error('Error en /api/informes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 💚 HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'PATAC México API',
    version: '1.0.0',
    uptime: process.uptime(),
    endpoints: {
      artesanos: '/api/artesanos',
      productos: '/api/productos',
      proyectos: '/api/proyectos',
      voluntarios: '/api/voluntarios',
      articulosBlog: '/api/articulosBlog',
      consultas: {
        GET: '/api/consultas',
        POST: '/api/consultas'
      },
      informes: '/api/informes',
      debug: '/api/debug',
      health: '/api/health'
    }
  });
});

// ========== 🛑 404 HANDLER ==========
app.use((req, res, next) => {
  // Si es una ruta API que no existe
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'Endpoint de API no encontrado',
      requestedUrl: req.originalUrl,
      availableApiEndpoints: [
        '/api/artesanos',
        '/api/artesanos/:id',
        '/api/productos',
        '/api/productos/:id',
        '/api/productos/categoria/:categoria',
        '/api/proyectos',
        '/api/proyectos/:id',
        '/api/voluntarios',
        '/api/articulosBlog',
        '/api/consultas',
        '/api/informes',
        '/api/debug',
        '/api/health'
      ]
    });
  }
  
  // Si no es API, intentar servir index.html (SPA fallback)
  const fs = require('fs');
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  
  // Último recurso: 404 genérico
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - PATAC México</title>
      <style>
        body { font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5; }
        h1 { color: #667eea; }
        .btn { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>404 - Página no encontrada</h1>
      <p>La ruta <code>${req.path}</code> no existe.</p>
      <a href="/" class="btn">Ir al inicio</a>
      <a href="/api/debug" class="btn">Ver diagnóstico</a>
    </body>
    </html>
  `);
});

// ========== 🚀 SERVIDOR LOCAL ==========
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🚀 PATAC API + Static Server corriendo en:`);
    console.log(`🌐 Sitio: http://localhost:${PORT}/`);
    console.log(`📊 API:   http://localhost:${PORT}/api/artesanos`);
    console.log(`🔧 Debug: http://localhost:${PORT}/api/debug`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health`);
    console.log(`📁 Archivos servidos desde: ${PUBLIC_DIR}\n`);
  });
}

// ⚙️ Exportar para Vercel
module.exports = app;