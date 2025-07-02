const axios = require('axios');
const fs = require('fs');

// Ruta al archivo JSON exportado
const jsonFilePath = './mapeado_estacionamientos.json';

// Leer el JSON generado
const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

// URL de tu backend
const apiUrl = 'http://localhost:4000/mapeado';

// Función para insertar cada registro
async function insertMapeado() {
    for (const item of data) {
        try {
            console.log(`Insertando ID: ${item.id} ...`);
            await axios.post(apiUrl, item);
            console.log(`✅ Insertado correctamente: ID ${item.id}`);
        } catch (error) {
            console.error(`❌ Error insertando ID ${item.id}:`, error.response?.data || error.message);
        }
    }
    console.log('✅ Proceso completo.');
}

// Ejecutar la función
insertMapeado();
