// api/sheets-db.js - Base de Datos Compatible con Vercel
const { google } = require('googleapis');

class SheetsDB {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    this.sheets = null;
    this.auth = null;
  }

  async connect() {
    let credentials;
    let authMethod = 'unknown';

    try {
      // PRIORIDAD 1: Variables individuales (RECOMENDADO para Vercel)
      if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        credentials = {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Convertir \n literales a saltos reales
        };
        authMethod = 'Variables individuales (GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY)';
      }
      // PRIORIDAD 2: JSON completo como string
      else if (process.env.SERVICE_ACCOUNT_JSON) {
        credentials = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
        authMethod = 'SERVICE_ACCOUNT_JSON (JSON completo)';
      }
      // PRIORIDAD 3: Archivo local (solo desarrollo)
      else {
        credentials = require('./service-account.json');
        authMethod = 'service-account.json (archivo local)';
      }

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ]
      });
      
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log(`✅ Conectado a Google Sheets API usando: ${authMethod}`);
      
      return { success: true, method: authMethod };
    } catch (error) {
      console.error('❌ Error en connect():', error.message);
      throw new Error(`Error de autenticación: ${error.message}`);
    }
  }

  // 📖 LEER TODOS
  async getAll(sheetName = 'artesanos') {
    try {
      await this.connect();
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log(`⚠️ No hay datos en la hoja: ${sheetName}`);
        return [];
      }

      const headers = rows[0];
      const data = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      console.log(`✅ ${data.length} registros leídos de ${sheetName}`);
      return data;
    } catch (error) {
      console.error(`❌ Error en getAll(${sheetName}):`, error.message);
      throw error;
    }
  }

  // 🔍 BUSCAR POR ID
  async getById(id, sheetName = 'artesanos') {
    try {
      const all = await this.getAll(sheetName);
      
      const idField = {
        'artesanos': 'idArtesano',
        'productos': 'idProducto',
        'proyectos': 'idProyecto',
        'voluntarios': 'idVoluntario',
        'articulosBlog': 'idArticulo'
      }[sheetName] || 'idArtesano';
      
      const found = all.find(item => item[idField] == id);
      
      if (found) {
        console.log(`✅ Registro encontrado en ${sheetName}: ${id}`);
      } else {
        console.log(`⚠️ Registro NO encontrado en ${sheetName}: ${id}`);
      }
      
      return found;
    } catch (error) {
      console.error(`❌ Error en getById(${id}, ${sheetName}):`, error.message);
      throw error;
    }
  }

  // ➕ CREAR NUEVO REGISTRO
  async create(data, sheetName = 'artesanos') {
    try {
      await this.connect();
      
      const headersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:Z1`,
      });
      const headers = headersResponse.data.values[0];

      const row = headers.map(header => data[header] || '');

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'RAW',
        resource: { values: [row] },
      });

      console.log(`✅ Nuevo registro creado en ${sheetName}`);
      return data;
    } catch (error) {
      console.error(`❌ Error en create(${sheetName}):`, error.message);
      throw error;
    }
  }

  // ✏️ ACTUALIZAR REGISTRO
  async update(id, updates, sheetName = 'artesanos') {
    try {
      await this.connect();
      
      const idField = {
        'artesanos': 'idArtesano',
        'productos': 'idProducto',
        'proyectos': 'idProyecto'
      }[sheetName] || 'idArtesano';
      
      const all = await this.getAll(sheetName);
      const recordIndex = all.findIndex(item => item[idField] == id);
      
      if (recordIndex === -1) {
        throw new Error(`Registro con ID ${id} no encontrado en ${sheetName}`);
      }

      const headersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:Z1`,
      });
      const headers = headersResponse.data.values[0];

      const rowIndex = recordIndex + 2;
      const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;

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
    } catch (error) {
      console.error(`❌ Error en update(${id}, ${sheetName}):`, error.message);
      throw error;
    }
  }

  // 🗑️ ELIMINAR REGISTRO
  async delete(id, sheetName = 'artesanos') {
    try {
      await this.connect();
      
      const idField = {
        'artesanos': 'idArtesano',
        'productos': 'idProducto'
      }[sheetName] || 'idArtesano';
      
      const all = await this.getAll(sheetName);
      const recordIndex = all.findIndex(item => item[idField] == id);
      
      if (recordIndex === -1) {
        throw new Error(`Registro con ID ${id} no encontrado en ${sheetName}`);
      }

      const rowIndex = recordIndex + 2;
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0,
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
    } catch (error) {
      console.error(`❌ Error en delete(${id}, ${sheetName}):`, error.message);
      throw error;
    }
  }

  // 🔧 MÉTODO DE DEBUG (para verificar configuración)
  async testConnection() {
    try {
      const connectionInfo = await this.connect();
      
      // Intentar leer una celda simple
      const testResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'artesanos!A1',
      });

      return {
        success: true,
        authMethod: connectionInfo.method,
        spreadsheetId: this.spreadsheetId,
        testRead: testResponse.data.values ? 'OK' : 'Sin datos',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = SheetsDB;