// sheets-db.js - Base de Datos Compatible con Vercel
const { google } = require('googleapis');

class SheetsDB {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    this.sheets = null;
    this.auth = null;
  }

  async connect() {
    // En Vercel, leer credenciales desde variable de entorno
    const credentials = process.env.SERVICE_ACCOUNT_JSON 
      ? JSON.parse(process.env.SERVICE_ACCOUNT_JSON)
      : require('./service-account.json'); // Fallback para desarrollo local

    this.auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ]
    });
    
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    console.log('✅ Conectado a Google Sheets API');
  }

  // 📖 LEER TODOS
  async getAll(sheetName = 'artesanos') {
    await this.connect();
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const headers = rows[0];
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }

  // 🔍 BUSCAR POR ID (mejorado para soportar diferentes campos ID)
  async getById(id, sheetName = 'artesanos') {
    const all = await this.getAll(sheetName);
    
    // Determinar el campo ID según la hoja
    const idField = {
      'artesanos': 'idArtesano',
      'productos': 'idProducto',
      'proyectos': 'idProyecto',
      'voluntarios': 'idVoluntario',
      'articulosBlog': 'idArticulo'
    }[sheetName] || 'idArtesano';
    
    return all.find(item => item[idField] == id);
  }

  // ➕ CREAR NUEVO REGISTRO
  async create(data, sheetName = 'artesanos') {
    await this.connect();
    
    // Obtener encabezados
    const headersResponse = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });
    const headers = headersResponse.data.values[0];

    // Convertir objeto a array según encabezados
    const row = headers.map(header => data[header] || '');

    // Insertar nueva fila
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'RAW',
      resource: { values: [row] },
    });

    console.log(`✅ Nuevo registro creado en ${sheetName}`);
    return data;
  }

  // ✏️ ACTUALIZAR REGISTRO
  async update(id, updates, sheetName = 'artesanos') {
    await this.connect();
    
    // Determinar campo ID
    const idField = {
      'artesanos': 'idArtesano',
      'productos': 'idProducto',
      'proyectos': 'idProyecto'
    }[sheetName] || 'idArtesano';
    
    // Encontrar fila del registro
    const all = await this.getAll(sheetName);
    const recordIndex = all.findIndex(item => item[idField] == id);
    
    if (recordIndex === -1) {
      throw new Error(`Registro con ID ${id} no encontrado en ${sheetName}`);
    }

    // Obtener encabezados
    const headersResponse = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });
    const headers = headersResponse.data.values[0];

    // Actualizar datos
    const rowIndex = recordIndex + 2; // +1 header, +1 base 1
    const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;

    // Crear nueva fila con updates
    const currentRow = all[recordIndex];
    const updatedRow = headers.map(header => {
      return updates[header] !== undefined ? updates[header] : currentRow[header];
    });

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values: [updatedRow] },
    });

    console.log(`✅ Registro actualizado en ${sheetName}`);
    return { ...currentRow, ...updates };
  }

  // 🗑️ ELIMINAR REGISTRO
  async delete(id, sheetName = 'artesanos') {
    await this.connect();
    
    // Determinar campo ID
    const idField = {
      'artesanos': 'idArtesano',
      'productos': 'idProducto'
    }[sheetName] || 'idArtesano';
    
    // Encontrar posición
    const all = await this.getAll(sheetName);
    const recordIndex = all.findIndex(item => item[idField] == id);
    
    if (recordIndex === -1) {
      throw new Error(`Registro con ID ${id} no encontrado en ${sheetName}`);
    }

    // Borrar fila
    const rowIndex = recordIndex + 2;
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: 0, // Primera hoja
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex
            }
          }
        }]
      }
    });

    console.log(`✅ Registro eliminado de ${sheetName}:`, id);
    return true;
  }
}

module.exports = SheetsDB;