// api/server.js
const express = require('express');
const cors = require('cors');
const SheetsDB = require('./sheets-db');

const app = express();
app.use(cors());
app.use(express.json());

const db = new SheetsDB('1SfoCefyVpqnjykWVLQGkfavWV45fQJ6StTNwGcKmw7g');

// ========== ¡IMPORTANTE! ELIMINAMOS TODO LO RELACIONADO CON ARCHIVOS ESTÁTICOS ==========
// Vercel sirve automáticamente todos los HTML, CSS, JS e imágenes que estén en la raíz del proyecto.
// NO necesitamos express.static ni res.sendFile. De hecho, usarlos rompe todo en serverless.
// Con este server.js "limpio", tu sitio funcionará al 100%.

// ========== 🔧 ENDPOINT DE DEBUG (TEMPORAL - ELIMINAR EN PRODUCCIÓN) ==========
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
      environment: { ...envCheck },
      googleSheetsConnection: connectionTest,
      dataTest: sampleData,
      dataTestError: sampleError,
      warnings: [
        '⚠️ ELIMINA ESTE ENDPOINT /api/debug ANTES DE PRODUCCIÓN',
        'Frontend ahora servido 100% por Vercel (static files)'
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

// ========== ENDPOINTS DE API (ÚNICOS que debe manejar este archivo) ==========
app.get('/api/artesanos', async (req, res) => {
  try {
    const data = await db.getAll('artesanos');
    res.json({ artesanos: data });
  } catch (error) {
    console.error('Error en /api/artesanos:', error);
    res.status(500).json({ error: 'Error al cargar artesanos', details: error.message });
  }
});

app.get('/api/artesanos/:id', async (req, res) => {
  try {
    const artesano = await db.getById(req.params.id, 'artesanos');
    if (!artesano) return res.status(404).json({ error: 'Artesano no encontrado' });
    res.json({ artesano });
  } catch (error) {
    console.error('Error en /api/artesanos/:id:', error);
    res.status(500).json({ error: 'Error al cargar artesano', details: error.message });
  }
});

app.get('/api/proyectos', async (req, res) => {
  try {
    const data = await db.getAll('proyectos');
    res.json({ proyectos: data });
  } catch (error) {
    console.error('Error en /api/proyectos:', error);
    res.status(500).json({ error: 'Error al cargar proyectos', details: error.message });
  }
});

app.get('/api/voluntarios', async (req, res) => {
  try {
    const data = await db.getAll('voluntarios');
    res.json({ voluntarios: data });
  } catch (error) {
    console.error('Error en /api/voluntarios:', error);
    res.status(500).json({ error: 'Error al cargar voluntarios', details: error.message });
  }
});

app.get('/api/articulosBlog', async (req, res) => {
  try {
    const data = await db.getAll('articulosBlog');
    res.json({ articulosBlogs: data });
  } catch (error) {
    console.error('Error en /api/articulosBlog:', error);
    res.status(500).json({ error: 'Error al cargar artículos', details: error.message });
  }
});

app.get('/api/productos', async (req, res) => {
  try {
    let productos = await db.getAll('productos');
    productos = productos.filter(p => parseInt(p.stock) > 0);

    const productosEnriquecidos = await Promise.all(
      productos.map(async (producto) => {
        if (producto.idArtesano) {
          const artesano = await db.getById(producto.idArtesano, 'artesanos');
          return {
            ...producto,
            artesano: artesano ? {
              nombre: artesano.nombreCompleto,
              comunidad: artesano.comunidad,
              estado: artesano.estado,
              tecnica: artesano.tecnica,
              urlFoto: artesano.urlFoto
            } : null
          };
        }
        return producto;
      })
    );

    res.json({ productos: productosEnriquecidos });
  } catch (error) {
    console.error('Error en /api/productos:', error);
    res.status(500).json({ error: 'Error al cargar productos', details: error.message });
  }
});

app.get('/api/productos/:id', async (req, res) => {
  try {
    const producto = await db.getById(req.params.id, 'productos');
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    if (producto.idArtesano) {
      const artesano = await db.getById(producto.idArtesano, 'artesanos');
      producto.artesano = artesano;
    }

    res.json({ producto });
  } catch (error) {
    console.error('Error en /api/productos/:id:', error);
    res.status(500).json({ error: 'Error al cargar producto', details: error.message });
  }
});

app.get('/api/productos/categoria/:categoria', async (req, res) => {
  try {
    const productos = await db.getAll('productos');
    const filtrados = productos.filter(p =>
      p.categoria.toLowerCase() === req.params.categoria.toLowerCase() &&
      parseInt(p.stock) > 0
    );
    res.json({ productos: filtrados });
  } catch (error) {
    console.error('Error en /api/productos/categoria:', error);
    res.status(500).json({ error: 'Error al filtrar productos', details: error.message });
  }
});

app.post('/api/consultas', async (req, res) => {
  try {
    const { clienteNombre, clienteEmail, clienteTelefono, productoId, mensaje } = req.body;

    if (!clienteNombre || !mensaje) {
      return res.status(400).json({ error: 'Nombre y mensaje son obligatorios' });
    }

    if (!clienteEmail && !clienteTelefono) {
      return res.status(400).json({ error: 'Debe proporcionar al menos email o teléfono' });
    }

    if (clienteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteEmail)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    let productoNombre = '';
    if (productoId) {
      const producto = await db.getById(productoId, 'productos');
      productoNombre = producto ? producto.nombre : 'Producto no encontrado';
    }

    const consulta = {
      timestamp: new Date().toISOString(),
      clienteNombre,
      clienteEmail: clienteEmail || 'No proporcionado',
      clienteTelefono: clienteTelefono || 'No proporcionado',
      productoId: productoId || 'Consulta general',
      productoNombre,
      mensaje,
      estado: 'Nuevo'
    };

    await db.create(consulta, 'consultas');
    res.status(201).json({
      success: true,
      mensaje: 'Consulta recibida. Nos pondremos en contacto pronto.',
      consulta
    });

  } catch (error) {
    console.error('Error en POST /api/consultas:', error);
    res.status(500).json({ error: 'Error al procesar consulta', details: error.message });
  }
});

app.get('/api/consultas', async (req, res) => {
  try {
    const consultas = await db.getAll('consultas');
    consultas.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ consultas });
  } catch (error) {
    console.error('Error en /api/consultas:', error);
    res.status(500).json({ error: 'Error al cargar consultas', details: error.message });
  }
});

app.get('/api/informes', async (req, res) => {
  try {
    const data = await db.getAll('informesAnuales');
    res.json({ informes: data });
  } catch (error) {
    console.error('Error en /api/informes:', error);
    res.status(500).json({ error: 'Error al cargar informes', details: error.message });
  }
});

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    note: 'Frontend servido por Vercel (static), backend 100% funcional'
  });
});

// ========== 404 SOLO PARA API ==========
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint API no encontrado' });
});

// ========== INICIO DEL SERVIDOR (solo local) ==========
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor PATAC corriendo en http://localhost:${PORT}`);
    console.log(`🔍 Debug: http://localhost:${PORT}/api/debug`);
    console.log(`💚 Health: http://localhost:${PORT}/health`);
  });
}

module.exports = app;