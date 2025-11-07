// api/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const SheetsDB = require('./sheets-db');

const app = express();
app.use(cors());
app.use(express.json());

const db = new SheetsDB('1SfoCefyVpqnjykWVLQGkfavWV45fQJ6StTNwGcKmw7g');

// ========== SOLO EN LOCAL: Servir archivos estáticos y HTML ==========
if (process.env.NODE_ENV !== 'production') {
  // Servir CSS, JS, imágenes, etc. desde la raíz del proyecto
  app.use(express.static(path.join(__dirname, '..')));

  // Rutas para páginas HTML
  const htmlPages = ['/', '/proyectos.html', '/artesanos.html', '/transparencia.html'];
  htmlPages.forEach(page => {
    app.get(page, (req, res) => {
      res.sendFile(path.join(__dirname, '..', page === '/' ? 'index.html' : page));
    });
  });
}

// ========== ENDPOINTS DE API (SIEMPRE ACTIVOS) ==========

app.get('/api/artesanos', async (req, res) => {
  try {
    const data = await db.getAll('artesanos');
    res.json({ artesanos: data });
  } catch (error) {
    console.error('Error en /api/artesanos:', error);
    res.status(500).json({ error: 'Error al cargar artesanos' });
  }
});

app.get('/api/artesanos/:id', async (req, res) => {
  try {
    const artesano = await db.getById(req.params.id, 'artesanos');
    if (!artesano) return res.status(404).json({ error: 'Artesano no encontrado' });
    res.json({ artesano });
  } catch (error) {
    console.error('Error en /api/artesanos/:id:', error);
    res.status(500).json({ error: 'Error al cargar artesano' });
  }
});

app.get('/api/proyectos', async (req, res) => {
  try {
    const data = await db.getAll('proyectos');
    res.json({ proyectos: data });
  } catch (error) {
    console.error('Error en /api/proyectos:', error);
    res.status(500).json({ error: 'Error al cargar proyectos' });
  }
});

app.get('/api/voluntarios', async (req, res) => {
  try {
    const data = await db.getAll('voluntarios');
    res.json({ voluntarios: data });
  } catch (error) {
    console.error('Error en /api/voluntarios:', error);
    res.status(500).json({ error: 'Error al cargar voluntarios' });
  }
});

app.get('/api/articulosBlog', async (req, res) => {
  try {
    const data = await db.getAll('articulosBlog');
    res.json({ articulosBlogs: data });
  } catch (error) {
    console.error('Error en /api/articulosBlog:', error);
    res.status(500).json({ error: 'Error al cargar artículos' });
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
    res.status(500).json({ error: 'Error al cargar productos' });
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
    res.status(500).json({ error: 'Error al cargar producto' });
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
    res.status(500).json({ error: 'Error al filtrar productos' });
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
    res.status(500).json({ error: 'Error al procesar consulta' });
  }
});

app.get('/api/consultas', async (req, res) => {
  try {
    const consultas = await db.getAll('consultas');
    consultas.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ consultas });
  } catch (error) {
    console.error('Error en /api/consultas:', error);
    res.status(500).json({ error: 'Error al cargar consultas' });
  }
});

app.get('/api/informes', async (req, res) => {
  try {
    const data = await db.getAll('informesAnuales');
    res.json({ informes: data });
  } catch (error) {
    console.error('Error en /api/informes:', error);
    res.status(500).json({ error: 'Error al cargar informes' });
  }
});

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: {
      artesanos: '/api/artesanos',
      productos: '/api/productos',
      proyectos: '/api/proyectos',
      voluntarios: '/api/voluntarios',
      articulosBlog: '/api/articulosBlog',
      consultas_POST: '/api/consultas',
      consultas_GET: '/api/consultas',
      informes: '/api/informes'
    }
  });
});

// ========== 404 (SIEMPRE al final) ==========
app.use((req, res) => {
  // En local: sirve index.html para SPA
  if (process.env.NODE_ENV !== 'production') {
    return res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
  // En Vercel: responde JSON
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// ========== INICIO DEL SERVIDOR (solo en local) ==========
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor PATAC corriendo en http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Productos: http://localhost:${PORT}/api/productos`);
    console.log(`Artesanos: http://localhost:${PORT}/api/artesanos`);
  });
}

// Exportar para Vercel
module.exports = app;