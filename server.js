// server.js - Servidor Express con API COMPLETA para Google Sheets
const express = require('express');
const cors = require('cors');
const path = require('path');
const SheetsDB = require('./sheets-db');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (CSS, JS, imágenes, etc.)
app.use(express.static('.'));

const db = new SheetsDB('1SfoCefyVpqnjykWVLQGkfavWV45fQJ6StTNwGcKmw7g');

// ========== ENDPOINTS DE API ==========

// Endpoint: /api/artesanos
app.get('/api/artesanos', async (req, res) => {
  try {
    const data = await db.getAll('artesanos');
    res.json({ artesanos: data });
  } catch (error) {
    console.error('Error en /api/artesanos:', error);
    res.status(500).json({ error: 'Error al cargar artesanos' });
  }
});

// Endpoint: /api/artesanos/:id (detalle individual)
app.get('/api/artesanos/:id', async (req, res) => {
  try {
    const artesano = await db.getById(req.params.id, 'artesanos');
    if (!artesano) {
      return res.status(404).json({ error: 'Artesano no encontrado' });
    }
    res.json({ artesano });
  } catch (error) {
    console.error('Error en /api/artesanos/:id:', error);
    res.status(500).json({ error: 'Error al cargar artesano' });
  }
});

// Endpoint: /api/proyectos
app.get('/api/proyectos', async (req, res) => {
  try {
    const data = await db.getAll('proyectos');
    res.json({ proyectos: data });
  } catch (error) {
    console.error('Error en /api/proyectos:', error);
    res.status(500).json({ error: 'Error al cargar proyectos' });
  }
});

// Endpoint: /api/voluntarios
app.get('/api/voluntarios', async (req, res) => {
  try {
    const data = await db.getAll('voluntarios');
    res.json({ voluntarios: data });
  } catch (error) {
    console.error('Error en /api/voluntarios:', error);
    res.status(500).json({ error: 'Error al cargar voluntarios' });
  }
});

// Endpoint: /api/articulosBlog
app.get('/api/articulosBlog', async (req, res) => {
  try {
    const data = await db.getAll('articulosBlog');
    res.json({ articulosBlogs: data });
  } catch (error) {
    console.error('Error en /api/articulosBlog:', error);
    res.status(500).json({ error: 'Error al cargar artículos' });
  }
});

// Endpoint: /api/productos
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

// Endpoint: /api/productos/:id
app.get('/api/productos/:id', async (req, res) => {
  try {
    const producto = await db.getById(req.params.id, 'productos');
    
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
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

// Endpoint: /api/productos/categoria/:categoria
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

// Endpoint: POST /api/consultas
app.post('/api/consultas', async (req, res) => {
  try {
    const { clienteNombre, clienteEmail, clienteTelefono, productoId, mensaje } = req.body;
    
    if (!clienteNombre || !mensaje) {
      return res.status(400).json({ 
        error: 'Nombre y mensaje son obligatorios' 
      });
    }
    
    if (!clienteEmail && !clienteTelefono) {
      return res.status(400).json({ 
        error: 'Debe proporcionar al menos email o teléfono' 
      });
    }
    
    if (clienteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteEmail)) {
      return res.status(400).json({ 
        error: 'Formato de email inválido' 
      });
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

// Endpoint: /api/consultas (GET)
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

// Endpoint: /api/informes
app.get('/api/informes', async (req, res) => {
  try {
    const data = await db.getAll('informesAnuales');
    res.json({ informes: data });
  } catch (error) {
    console.error('Error en /api/informes:', error);
    res.status(500).json({ error: 'Error al cargar informes' });
  }
});

// ========== ENDPOINT DE SALUD ==========
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

// ========== RUTAS PARA PÁGINAS HTML ==========
// IMPORTANTE: Estas deben ir DESPUÉS de todas las rutas de API

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/proyectos.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'proyectos.html'));
});

app.get('/artesanos.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'artesanos.html'));
});

app.get('/transparencia.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'transparencia.html'));
});

// Manejo de rutas no encontradas (debe ser la ÚLTIMA ruta)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Inicia el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor PATAC corriendo en http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🛍️  Productos: http://localhost:${PORT}/api/productos`);
  console.log(`👥 Artesanos: http://localhost:${PORT}/api/artesanos`);
});