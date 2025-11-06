// test-oficial.js - API OFICIAL GOOGLE (FUNCIONA SIEMPRE)
const { google } = require('googleapis');

async function test() {
  try {
    // Carga credenciales
    const auth = new google.auth.GoogleAuth({
      keyFile: './service-account.json',
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ]
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // TU SHEET ID (¡YA LO TIENES!)
    const spreadsheetId = '1SfoCefyVpqnjykWVLQGkfavWV45fQJ6StTNwGcKmw7g';

    // LEER TODOS LOS DATOS
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'artesanos!A:Z', // Lee toda la hoja "artesanos"
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('❌ No hay datos en la hoja "artesanos"');
      return;
    }

    console.log('✅ ¡CONECTADO con API OFICIAL!');
    console.log('📊 Título:', response.data.spreadsheetTitle);
    console.log(`📋 ${rows.length - 1} registros encontrados:`);

    // Encabezados
    const headers = rows[0];
    console.log('🔤 Encabezados:', headers);

    // Datos (sin encabezados)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      console.log(`${i}:`, {
        idArtesano: row[0] || '',
        nombreCompleto: row[1] || '',
        comunidad: row[2] || '',
        tecnica: row[3] || ''
      });
    }

    console.log('🎉 ¡TODO FUNCIONA PERFECTAMENTE!');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    if (error.message.includes('permission')) {
      console.log('🔧 SOLUCIÓN: Ve a tu Google Sheet → "Compartir" → Agrega el email del service-account.json como EDITOR');
    } else if (error.message.includes('service-account.json')) {
      console.log('🔧 SOLUCIÓN: Verifica que service-account.json esté en C:\\Pagina PATAC\\');
    } else if (error.message.includes('not found')) {
      console.log('🔧 SOLUCIÓN: Verifica que la hoja se llame exactamente "artesanos"');
    }
  }
}

test();