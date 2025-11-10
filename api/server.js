// api/server.js - Versión limpia y optimizada para Vercel
const express = require('express');
const cors = require('cors');
const SheetsDB = require('./sheets-db');

const app = express();

// Configuración básica
app.use(cors());
app.use(express.json());

// ID de tu Google Sheet (puedes moverlo a variable de entorno si quieres)
const SPREADSHEET_ID = '1SfoCefyVpqnjykWVLQGkfavWV45fQJ6StTNwGcKmw7g';
const db = new SheetsDB(SPREADSHEET_ID);

// 🔍 Middleware de logging (opcional, útil para depuración en Vercel)
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// ========== 🔧 ENDPOINT DE DEBUG ==========
app.get('/api/debug', async (req, res) => {
  try {
    const envCheck = {
      GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_PRIVATE_KEY_length: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0,
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
      status: '✅ DEBUG MODE - TODO OK',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      googleSheetsConnection: connectionTest,
      dataTest: sampleData,
      dataTestError: sampleError,
      warnings: [
        '⚠️ ELIMINA /api/debug EN PRODUCCIÓN',
        'Los archivos estáticos (/index.html, etc.) son servidos por Vercel (no por esta API)'
      ]
    });
  } catch (error) {
    console.error('❌ Error en /api/debug:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
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
      consultas: '/api/consultas',
      informes: '/api/informes',
      debug: '/api/debug',
      health: '/api/health'
    }
  });
});

// ========== 🛑 Manejo de 404 solo para rutas /api/ ==========
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'Endpoint de API no encontrado',
      requestedUrl: req.originalUrl
    });
  }
  // Si no es /api/, Vercel ya intentará servir desde /public (gracias a vercel.json)
  // ¡No debes manejar rutas no-API aquí!
  next();
});

// ========== 🚨 Manejo global de errores (solo API) ==========
app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message
  });
});

// ⚙️ Exportar app para Vercel
module.exports = app;