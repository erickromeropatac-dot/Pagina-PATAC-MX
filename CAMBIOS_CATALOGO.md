# Cambios Necesarios en catalogo.html

## Objetivo
Actualizar las referencias de nombres de columnas de Google Sheets para que coincidan con el esquema real de la base de datos.

## Cambios Requeridos

### 1. Línea 360 - populateArtisanFilter()
**Buscar:**
```javascript
`<option value="${a.idArtesano}">${a.nombre}</option>`
```

**Reemplazar con:**
```javascript
`<option value="${a.idArtesano}">${a.nombreCompleto}</option>`
```

---

### 2. Líneas 512-515 - Tarjeta de producto (artisan-mini-info)
**Buscar:**
```javascript
<img src="${artesano.foto || 'https://via.placeholder.com/40'}" alt="${artesano.nombre}" class="artisan-mini-photo">
<div>
    <p class="artisan-mini-label">Creado por</p>
    <a href="artesanos.html#${artesano.idArtesano}" class="artisan-mini-name">${artesano.nombre}</a>
```

**Reemplazar con:**
```javascript
<img src="${artesano.urlFoto || 'https://via.placeholder.com/40'}" alt="${artesano.nombreCompleto}" class="artisan-mini-photo">
<div>
    <p class="artisan-mini-label">Creado por</p>
    <a href="artesanos.html#${artesano.idArtesano}" class="artisan-mini-name">${artesano.nombreCompleto}</a>
```

---

### 3. Línea 565 - Mensaje de WhatsApp
**Buscar:**
```javascript
`👤 Artesano: ${artesano ? artesano.nombre : 'N/A'}\n` +
```

**Reemplazar con:**
```javascript
`👤 Artesano: ${artesano ? artesano.nombreCompleto : 'N/A'}\n` +
```

---

### 4. Líneas 632-634 - Modal de producto (artisan-profile-card)
**Buscar:**
```javascript
<img src="${artesano.foto || 'https://via.placeholder.com/80'}" alt="${artesano.nombre}" class="w-20 h-20 rounded-full object-cover">
<div>
    <h4 class="font-bold text-lg">${artesano.nombre}</h4>
```

**Reemplazar con:**
```javascript
<img src="${artesano.urlFoto || 'https://via.placeholder.com/80'}" alt="${artesano.nombreCompleto}" class="w-20 h-20 rounded-full object-cover">
<div>
    <h4 class="font-bold text-lg">${artesano.nombreCompleto}</h4>
```

---

## Resumen de Cambios
- **artesano.nombre** → **artesano.nombreCompleto** (4 ubicaciones)
- **artesano.foto** → **artesano.urlFoto** (2 ubicaciones)

## Razón
El esquema de Google Sheets usa `nombreCompleto` y `urlFoto` como nombres de columna, no `nombre` y `foto`. Estos cambios aseguran que el código JavaScript coincida con la estructura real de la base de datos.
