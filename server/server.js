const express = require("express");
const cors = require("cors");
const pool = require("./database")
var app = express();
const compression = require('compression');
const app = express();
const PORT = process.env.PORT || 4000;

// CORS: ajusta a tus URLs de front (dev y prod)
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://drivesmart-web.vercel.app/'
    ]
}));

app.use(compression());
app.use(express.json());


//VALIDACION DEL LOGIN CON LA BD
app.post('/login', (req, res) => {
    const sql = "SELECT * FROM usuarios WHERE email= $1 AND password= $2";
    const VALUES = [
        req.body.username,
        req.body.password
    ]
    pool.query(sql, VALUES, (err, data) => {
        if (err) return res.json("Login Failed");
        if (data.rows.length === 0) return res.json("Invalid username or password");
        return res.json("Login Successful");
    })
})
//CRUD DE USUARIOS ADMINISTRATIVOS
app.get('/usuarios', async (req, res) => {
    try {
        const allUsuarios = await pool.query('SELECT * FROM usuarios');
        res.json(allUsuarios.rows);
    } catch (err) {
        console.error(err.message);
    }
});

app.post('/usuarios', async (req, res) => {
    try {
        const { username, password, email, phone, address } = req.body;
        const newUsuario = await pool.query('INSERT INTO usuarios (username, password, email, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING *', [username, password, email, phone, address]);
        res.json(newUsuario.rows[0]);
    } catch (err) {
        console.error(err.message);
    }
});

app.put('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, email, phone, address } = req.body;
        const updateUsuario = await pool.query('UPDATE usuarios SET username = $1, password = $2, email = $3, phone = $4, address = $5 WHERE id_user = $6', [username, password, email, phone, address, id]);
        res.json('Usuario actualizado');
    } catch (err) {
        console.error(err.message);
    }
});

app.delete('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleteUsuario = await pool.query('DELETE FROM usuarios WHERE id_user = $1', [id]);
        res.json('Usuario eliminado');
    } catch (err) {
        console.error(err.message);
    }
});

//CRUD MAPEADO
//CARGADO DE DATOS
app.get('/mapeado', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, type, ST_AsGeoJSON(geometry) as geometry, restriccion FROM public.mapeado');
        const mapeados = result.rows.map(row => {
            // Invierte las coordenadas y elimina un nivel de anidamiento
            let latlngs;
            if (row.type === 'polygon') {
                latlngs = JSON.parse(row.geometry).coordinates[0][0].map(coord => [coord[1], coord[0]]);
            } else {
                latlngs = JSON.parse(row.geometry).coordinates[0].map(coord => [coord[1], coord[0]]);
            }
            if (row.type == 'marker') {
                latlngs = JSON.parse(row.geometry).coordinates;
            }
            return {
                id: row.id,
                type: row.type,
                latlngs: latlngs,
                restriction: row.restriccion // Agrega la restricción al objeto
            };
        });
        res.json(mapeados);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Error getting map data", error: err.message });
    }
});

//INSERTAR
app.post('/mapeado', (req, res) => {
    const { id, latlngs, type, restriction } = req.body;
    let geometryWKT;

    if (type === "polyline") {
        const flattenedLatlngs = [].concat(...latlngs);
        geometryWKT = `LINESTRING(${flattenedLatlngs.map(point => `${point.lng} ${point.lat}`).join(', ')})`;
    } else if (type === "polygon") {
        // Asegurarse de que el primer y último punto sean iguales
        const ring = latlngs[0];
        if (ring[0].lat !== ring[ring.length - 1].lat || ring[0].lng !== ring[ring.length - 1].lng) {
            ring.push(ring[0]);
        }
        const ringWKT = ring.map(point => `${point.lng} ${point.lat}`).join(', ');
        geometryWKT = `POLYGON((${ringWKT}))`;
    } else if (type === "marker") {
        const { lat, lng } = latlngs[0];  // Para el marcador, se espera un array con un solo objeto { lat, lng }
        geometryWKT = `POINT(${lng} ${lat})`;
    }

    const sql = "INSERT INTO public.mapeado (id, type, geometry, restriccion) VALUES ($1, $2, ST_Multi(ST_GeomFromText($3, 4326)), $4)";
    const VALUES = [
        id,
        type,
        geometryWKT,
        restriction
    ]
    pool.query(sql, VALUES, (err, data) => {
        if (err) return res.status(500).json({ message: "Error saving data", error: err.message });
        return res.json("Data saved successfully");
    })
});


//EDITAR LO QUE ESTOY INTENTANDO AHORA
app.put('/mapeado/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { latlngs, type } = req.body;
        let geometryWKT;

        if (type === "polyline") {
            const flattenedLatlngs = [].concat(...latlngs);
            geometryWKT = `LINESTRING(${flattenedLatlngs.map(point => `${point.lng} ${point.lat}`).join(', ')})`;
        } else if (type === "polygon") {
            // Asegurarse de que el primer y último punto sean iguales
            const ring = latlngs[0];
            if (ring[0].lat !== ring[ring.length - 1].lat || ring[0].lng !== ring[ring.length - 1].lng) {
                ring.push(ring[0]);
            }
            const ringWKT = ring.map(point => `${point.lng} ${point.lat}`).join(', ');
            geometryWKT = `POLYGON((${ringWKT}))`;
        }

        const sql = "UPDATE public.mapeado SET type = $1, geometry = ST_Multi(ST_GeomFromText($2, 4326)) WHERE id = $3";
        const VALUES = [
            type,
            geometryWKT,
            id
        ]
        await pool.query(sql, VALUES);
        res.json('Mapeado actualizado');
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Error updating map data", error: err.message });
    }
});

//ELIMINAR
app.delete('/mapeado/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = "DELETE FROM public.mapeado WHERE id = $1";
        await pool.query(sql, [id]);
        res.json('Mapeado eliminado');
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Error deleting map data", error: err.message });
    }
});



app.listen(PORT, () => console.log(`server on port ${PORT}`));

