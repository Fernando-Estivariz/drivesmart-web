const express = require("express")
const cors = require("cors")
const pool = require("./database")
var app = express()
const compression = require("compression")
app.use(compression())
app.use(express.json())
app.use(
    cors({
        origin: "*",
        credentials: true,
    }),
)

const PORT = process.env.PORT || 4000

function getColorByIntensity(intensidad) {
    if (intensidad >= 80) return "#dc2626" // Rojo intenso
    if (intensidad >= 60) return "#ea580c" // Naranja oscuro
    if (intensidad >= 40) return "#f59e0b" // Naranja
    if (intensidad >= 20) return "#fbbf24" // Amarillo
    return "#84cc16" // Verde
}

//VALIDACION DEL LOGIN CON LA BD
app.post("/login", (req, res) => {
    console.log("▶️  /login body:", req.body)
    const sql = "SELECT * FROM usuarios WHERE email= $1 AND password= $2"
    const VALUES = [req.body.username, req.body.password]
    pool.query(sql, VALUES, (err, data) => {
        if (err) return res.json("Login Failed")
        if (data.rows.length === 0) return res.json("Invalid username or password")
        console.log("🗃️  /login rows:", data.rows)
        return res.json("Login Successful")
    })
})

//CRUD DE USUARIOS ADMINISTRATIVOS
app.get("/usuarios", async (req, res) => {
    try {
        console.log("[v0] GET /usuarios - Fetching all usuarios")
        const allUsuarios = await pool.query("SELECT * FROM usuarios")
        console.log("[v0] Found", allUsuarios.rows.length, "usuarios")
        res.json(allUsuarios.rows)
    } catch (err) {
        console.error("[v0] Error fetching usuarios:", err.message)
        res.status(500).json({ message: "Error fetching usuarios", error: err.message })
    }
})

app.post("/usuarios", async (req, res) => {
    try {
        const { username, password, email, phone, address } = req.body
        console.log("[v0] POST /usuarios - Inserting new usuario:", { username, email, phone })

        const newUsuario = await pool.query(
            "INSERT INTO usuarios (username, password, email, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [username, password, email, phone, address],
        )

        console.log("[v0] Usuario inserted successfully with ID:", newUsuario.rows[0].id_user)
        res.json(newUsuario.rows[0])
    } catch (err) {
        console.error("[v0] Error inserting usuario:", err.message)
        res.status(500).json({ message: "Error inserting usuario", error: err.message })
    }
})

app.put("/usuarios/:id", async (req, res) => {
    try {
        const { id } = req.params
        const { username, password, email, phone, address } = req.body

        console.log("[v0] PUT /usuarios/:id - Updating usuario with ID:", id)
        console.log("[v0] New data:", { username, email, phone })

        const updateUsuario = await pool.query(
            "UPDATE usuarios SET username = $1, password = $2, email = $3, phone = $4, address = $5 WHERE id_user = $6 RETURNING *",
            [username, password, email, phone, address, id],
        )

        if (updateUsuario.rows.length === 0) {
            console.error("[v0] Usuario not found with ID:", id)
            return res.status(404).json({ message: "Usuario no encontrado" })
        }

        console.log("[v0] Usuario updated successfully with ID:", id)
        res.json(updateUsuario.rows[0])
    } catch (err) {
        console.error("[v0] Error updating usuario:", err.message)
        res.status(500).json({ message: "Error updating usuario", error: err.message })
    }
})

app.delete("/usuarios/:id", async (req, res) => {
    try {
        const { id } = req.params
        console.log("[v0] DELETE /usuarios/:id - Deleting usuario with ID:", id)

        const deleteUsuario = await pool.query("DELETE FROM usuarios WHERE id_user = $1 RETURNING *", [id])

        if (deleteUsuario.rows.length === 0) {
            console.error("[v0] Usuario not found with ID:", id)
            return res.status(404).json({ message: "Usuario no encontrado" })
        }

        console.log("[v0] Usuario deleted successfully with ID:", id)
        res.json({ success: true, message: "Usuario eliminado", deletedUser: deleteUsuario.rows[0] })
    } catch (err) {
        console.error("[v0] Error deleting usuario:", err.message)
        res.status(500).json({ message: "Error deleting usuario", error: err.message })
    }
})

//CRUD MAPEADO
//CARGADO DE DATOS
app.get("/mapeado", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, type, ST_AsGeoJSON(geometry) as geometry, restriccion FROM public.mapeado",
        )
        const mapeados = result.rows.map((row) => {
            // Invierte las coordenadas y elimina un nivel de anidamiento
            let latlngs
            if (row.type === "polygon") {
                latlngs = JSON.parse(row.geometry).coordinates[0][0].map((coord) => [coord[1], coord[0]])
            } else {
                latlngs = JSON.parse(row.geometry).coordinates[0].map((coord) => [coord[1], coord[0]])
            }
            if (row.type == "marker") {
                latlngs = JSON.parse(row.geometry).coordinates
            }
            return {
                id: row.id,
                type: row.type,
                latlngs: latlngs,
                restriction: row.restriccion, // Agrega la restricción al objeto
            }
        })
        res.json(mapeados)
    } catch (err) {
        console.error(err.message)
        res.status(500).json({ message: "Error getting map data", error: err.message })
    }
})

//INSERTAR
app.post("/mapeado", async (req, res) => {
    const { latlngs, type, restriction } = req.body

    console.log("[v0] POST /mapeado - Received body:", JSON.stringify(req.body))
    console.log("[v0] Type:", type, "Restriction:", restriction)
    console.log("[v0] Latlngs:", latlngs)

    if (!latlngs || (Array.isArray(latlngs) && latlngs.length === 0)) {
        console.error("[v0] Missing or empty latlngs")
        return res.status(400).json({
            message: "Coordenadas faltantes",
            error: "Se requieren coordenadas válidas",
        })
    }

    try {
        const maxIdResult = await pool.query("SELECT COALESCE(MAX(id), 0) as max_id FROM mapeado")
        const maxId = Number.parseInt(maxIdResult.rows[0].max_id)
        const nextId = maxId + 1

        console.log("[v0] Calculated next ID from database:", nextId)
        console.log("[v0] Inserting new mapeado with ID:", nextId, "Type:", type, "Restriction:", restriction)

        let geometryWKT

        if (type === "polyline") {
            const coords = (latlngs || []).map((point) => {
                if (Array.isArray(point)) {
                    const [lat, lng] = point
                    return { lat, lng }
                }
                return { lat: point.lat, lng: point.lng }
            })

            if (!coords.length) {
                console.error("[v0] Empty latlngs for polyline insert")
                return res.status(400).json({ message: "Latlngs vacíos para polyline" })
            }

            geometryWKT = `LINESTRING(${coords.map((p) => `${p.lng} ${p.lat}`).join(", ")})`
        } else if (type === "polygon") {
            const ring = latlngs[0]
            if (ring[0].lat !== ring[ring.length - 1].lat || ring[0].lng !== ring[ring.length - 1].lng) {
                ring.push(ring[0])
            }
            const ringWKT = ring.map((point) => `${point.lng} ${point.lat}`).join(", ")
            geometryWKT = `POLYGON((${ringWKT}))`
        } else if (type === "marker") {
            const { lat, lng } = latlngs[0]
            geometryWKT = `POINT(${lng} ${lat})`
        }

        console.log("[v0] Generated WKT:", geometryWKT)

        const sql =
            "INSERT INTO public.mapeado (id, type, geometry, restriccion) VALUES ($1, $2, ST_Multi(ST_GeomFromText($3, 4326)), $4) RETURNING *"
        const VALUES = [nextId, type, geometryWKT, restriction]

        const result = await pool.query(sql, VALUES)
        console.log("[v0] Mapeado inserted successfully with ID:", nextId)
        return res.json({ success: true, message: "Data saved successfully", id: nextId, data: result.rows[0] })
    } catch (err) {
        console.error("[v0] Error in POST /mapeado:", err.message)
        return res.status(500).json({ message: "Error saving data", error: err.message })
    }
})

//EDITAR
app.put("/mapeado/:id", async (req, res) => {
    try {
        const { id } = req.params
        const { latlngs, type, restriction } = req.body

        console.log("[v0] ===== PUT /mapeado/:id DEBUG =====")
        console.log("[v0] ID:", id)
        console.log("[v0] Type:", type)
        console.log("[v0] Restriction:", restriction)
        console.log("[v0] Latlngs length:", latlngs?.length)

        let geometryWKT

        if (type === "polyline") {
            const coords = (latlngs || []).map((point) => {
                if (Array.isArray(point)) {
                    const [lat, lng] = point
                    return { lat, lng }
                }
                return { lat: point.lat, lng: point.lng }
            })

            if (!coords.length) {
                console.error("[v0] Empty latlngs for polyline update")
                return res.status(400).json({ message: "Latlngs vacíos para polyline" })
            }

            geometryWKT = `LINESTRING(${coords.map((p) => `${p.lng} ${p.lat}`).join(", ")})`
        } else if (type === "polygon") {
            const ring = latlngs[0]
            if (ring[0].lat !== ring[ring.length - 1].lat || ring[0].lng !== ring[ring.length - 1].lng) {
                ring.push(ring[0])
            }
            const ringWKT = ring.map((point) => `${point.lng} ${point.lat}`).join(", ")
            geometryWKT = `POLYGON((${ringWKT}))`
        }

        console.log("[v0] Generated WKT:", geometryWKT)

        const sql =
            "UPDATE public.mapeado SET type = $1, geometry = ST_Multi(ST_GeomFromText($2, 4326)), restriccion = $3 WHERE id = $4"
        const VALUES = [type, geometryWKT, restriction, id]

        console.log("[v0] SQL:", sql)
        console.log("[v0] VALUES:", VALUES)

        await pool.query(sql, VALUES)

        console.log("[v0] Mapeado updated successfully")
        console.log("[v0] ===== END PUT /mapeado/:id DEBUG =====")

        res.json("Mapeado actualizado")
    } catch (err) {
        console.error("[v0] Error updating mapeado:", err.message)
        console.error("[v0] Full error:", err)
        res.status(500).json({ message: "Error updating map data", error: err.message })
    }
})

//ELIMINAR
app.delete("/mapeado/:id", async (req, res) => {
    try {
        const { id } = req.params
        const sql = "DELETE FROM public.mapeado WHERE id = $1"
        await pool.query(sql, [id])
        res.json("Mapeado eliminado")
    } catch (err) {
        console.error(err.message)
        res.status(500).json({ message: "Error deleting map data", error: err.message })
    }
})

//CRUD RESTRICCIONES VEHICULARES

//OBTENER TODAS LAS RESTRICCIONES
app.get("/restricciones", async (req, res) => {
    try {
        console.log("[v0] GET /restricciones - Fetching all restricciones from mapeado table")

        const maxIdResult = await pool.query("SELECT COALESCE(MAX(id), 0) as max_id FROM mapeado")
        const maxId = Number.parseInt(maxIdResult.rows[0].max_id)
        const nextId = maxId + 1

        console.log("[v0] MAX(id) from entire mapeado table:", maxId)
        console.log("[v0] Next available ID:", nextId)

        const result = await pool.query(
            "SELECT id, type, ST_AsGeoJSON(geometry) as geometry, restriccion FROM mapeado WHERE type = 'polygon'",
        )

        console.log("[v0] Found", result.rows.length, "restricciones")

        const restricciones = result.rows.map((row) => {
            let latlngs
            const geojson = JSON.parse(row.geometry)

            if (row.type === "polygon") {
                latlngs = geojson.coordinates[0][0].map((coord) => ({ lat: coord[1], lng: coord[0] }))
            }

            return {
                id: row.id,
                type: row.type,
                latlngs: latlngs,
                restriction: row.restriccion,
            }
        })

        console.log("[v0] Returning", restricciones.length, "restricciones with nextId:", nextId)
        res.json({ data: restricciones, nextId: nextId })
    } catch (err) {
        console.error("[v0] Error fetching restricciones:", err.message)
        res.status(500).json({ message: "Error getting restricciones data", error: err.message })
    }
})

//CREAR NUEVA RESTRICCIÓN
app.post("/restricciones", async (req, res) => {
    const { latlngs, type, restriction } = req.body

    console.log("[v0] POST /restricciones - Request body:", JSON.stringify(req.body, null, 2))
    console.log("[v0] Type:", type, "Restriction:", restriction)
    console.log("[v0] Latlngs:", JSON.stringify(latlngs, null, 2))

    if (!latlngs || (Array.isArray(latlngs) && latlngs.length === 0)) {
        console.error("[v0] Missing or empty latlngs")
        return res.status(400).json({
            message: "Coordenadas faltantes",
            error: "Se requieren coordenadas válidas",
        })
    }

    try {
        const maxIdResult = await pool.query("SELECT COALESCE(MAX(id), 0) as max_id FROM mapeado")
        const maxId = Number.parseInt(maxIdResult.rows[0].max_id)
        const nextId = maxId + 1

        console.log("[v0] Calculated next ID from database:", nextId)
        console.log("[v0] Inserting new restricción with ID:", nextId, "Type:", type, "Restriction:", restriction)

        let geometryWKT

        if (type === "polygon") {
            const ring = latlngs
            if (ring[0].lat !== ring[ring.length - 1].lat || ring[0].lng !== ring[ring.length - 1].lng) {
                ring.push(ring[0])
            }
            const ringWKT = ring.map((point) => `${point.lng} ${point.lat}`).join(", ")
            geometryWKT = `POLYGON((${ringWKT}))`
            console.log("[v0] Generated WKT:", geometryWKT)
        }

        const sql =
            "INSERT INTO mapeado (id, type, geometry, restriccion) VALUES ($1, $2, ST_Multi(ST_GeomFromText($3, 4326)), $4) RETURNING *"
        const VALUES = [nextId, type, geometryWKT, restriction]

        console.log("[v0] SQL:", sql)
        console.log("[v0] VALUES:", VALUES)

        const result = await pool.query(sql, VALUES)
        console.log("[v0] Restricción inserted successfully with ID:", nextId)
        return res.json({ success: true, message: "Restricción saved successfully", id: nextId, data: result.rows[0] })
    } catch (err) {
        console.error("[v0] Error inserting restricción:", err.message)
        console.error("[v0] Full error:", err)
        res.status(500).json({ message: "Error saving restricción", error: err.message })
    }
})

//EDITAR RESTRICCIÓN EXISTENTE
app.put("/restricciones/:id", async (req, res) => {
    try {
        const { id } = req.params
        const { latlngs, type, restriction } = req.body

        console.log("[v0] PUT /restricciones/:id - Updating restricción with ID:", id)
        console.log("[v0] Request body:", JSON.stringify(req.body, null, 2))

        let geometryWKT

        if (type === "polygon") {
            const ring = latlngs
            if (ring[0].lat !== ring[ring.length - 1].lat || ring[0].lng !== ring[ring.length - 1].lng) {
                ring.push(ring[0])
            }
            const ringWKT = ring.map((point) => `${point.lng} ${point.lat}`).join(", ")
            geometryWKT = `POLYGON((${ringWKT}))`
            console.log("[v0] Generated WKT:", geometryWKT)
        }

        const sql =
            "UPDATE mapeado SET type = $1, geometry = ST_Multi(ST_GeomFromText($2, 4326)), restriccion = $3 WHERE id = $4"
        const VALUES = [type, geometryWKT, restriction, id]

        console.log("[v0] SQL:", sql)
        console.log("[v0] VALUES:", VALUES)

        await pool.query(sql, VALUES)

        console.log("[v0] Restricción updated successfully with ID:", id)
        res.json({ success: true, message: "Restricción actualizada" })
    } catch (err) {
        console.error("[v0] Error updating restricción:", err.message)
        console.error("[v0] Full error:", err)
        res.status(500).json({ message: "Error updating restricción", error: err.message })
    }
})

//ELIMINAR RESTRICCIÓN
app.delete("/restricciones/:id", async (req, res) => {
    try {
        const { id } = req.params
        console.log("[v0] DELETE /restricciones/:id - Deleting restricción with ID:", id)

        const sql = "DELETE FROM mapeado WHERE id = $1"

        console.log("[v0] SQL:", sql)
        console.log("[v0] ID:", id)

        await pool.query(sql, [id])

        console.log("[v0] Restricción deleted successfully with ID:", id)
        res.json({ success: true, message: "Restricción eliminada" })
    } catch (err) {
        console.error("[v0] Error deleting restricción:", err.message)
        console.error("[v0] Full error:", err)
        res.status(500).json({ message: "Error deleting restricción", error: err.message })
    }
})

//ESTADISTICAS
app.get("/api/estadisticas", async (req, res) => {
    try {
        const { year, month, week } = req.query

        let dateFilter = ""
        if (year) {
            dateFilter += ` AND EXTRACT(YEAR FROM inicio_en) = ${year}`
        }
        if (month) {
            dateFilter += ` AND EXTRACT(MONTH FROM inicio_en) = ${month}`
        }
        if (week) {
            dateFilter += ` AND EXTRACT(WEEK FROM inicio_en) = ${week}`
        }

        const statsQuery = `
            SELECT 
                COUNT(*) as total_viajes,
                COALESCE(SUM(distancia_km), 0) as kilometros_recorridos,
                COALESCE(SUM(EXTRACT(EPOCH FROM tiempo_fin)/60), 0) as tiempo_ahorrado,
                COUNT(CASE WHEN estado = 'completado' THEN 1 END) as viajes_completados,
                COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) as viajes_cancelados,
                COUNT(CASE WHEN encontro_estacionamiento = true OR encontro_estacionamiento IS NULL THEN 1 END) as viajes_con_parking,
                COUNT(CASE WHEN encontro_estacionamiento = false THEN 1 END) as viajes_sin_parking,
                AVG(distancia_km) as distancia_promedio,
                AVG(EXTRACT(EPOCH FROM tiempo_fin)/60) as tiempo_promedio_busqueda
            FROM historial 
            WHERE estado IN ('completado', 'cancelado')
            ${dateFilter}
        `

        const statsResult = await pool.query(statsQuery)
        const stats = statsResult.rows[0]

        const tasaExitoGeneralQuery = `
            SELECT 
                COUNT(*) as total_viajes,
                COUNT(CASE WHEN estado = 'completado' THEN 1 END) as viajes_completados,
                COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) as viajes_cancelados
            FROM historial 
            WHERE estado IN ('completado', 'cancelado')
            ${dateFilter}
        `
        const tasaExitoGeneralResult = await pool.query(tasaExitoGeneralQuery)
        const tasaExitoGeneral = tasaExitoGeneralResult.rows[0]

        const tasaExitoDestinoQuery = `
            SELECT 
                COUNT(*) as total_viajes,
                COUNT(CASE WHEN encontro_estacionamiento = true OR encontro_estacionamiento IS NULL THEN 1 END) as encontro_en_destino,
                COUNT(CASE WHEN encontro_estacionamiento = false THEN 1 END) as no_encontro_en_destino
            FROM historial 
            WHERE estado IN ('completado', 'cancelado')
            ${dateFilter}
        `
        const tasaExitoDestinoResult = await pool.query(tasaExitoDestinoQuery)
        const tasaExitoDestino = tasaExitoDestinoResult.rows[0]

        const tasaExitoGeoQuery = `
            SELECT 
                COUNT(*) as viajes_que_necesitaron_geo,
                COUNT(CASE 
                    WHEN (encontro_lugar_busqueda = true OR encontro_lugar_busqueda IS NULL) 
                    AND estado = 'completado' 
                    THEN 1 
                END) as exitos_geo,
                COUNT(CASE 
                    WHEN estado = 'cancelado' 
                    THEN 1 
                END) as fallos_geo
            FROM historial 
            WHERE encontro_estacionamiento = false
            AND estado IN ('completado', 'cancelado')
            ${dateFilter}
        `
        const tasaExitoGeoResult = await pool.query(tasaExitoGeoQuery)
        const tasaExitoGeo = tasaExitoGeoResult.rows[0]

        const evolucionTasasQuery = `
            SELECT 
                DATE(inicio_en) as fecha,
                (COUNT(CASE WHEN estado = 'completado' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100) as tasa_general,
                (COUNT(CASE WHEN encontro_estacionamiento = true OR encontro_estacionamiento IS NULL THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100) as tasa_destino,
                (COUNT(CASE 
                    WHEN encontro_estacionamiento = false 
                    AND (encontro_lugar_busqueda = true OR encontro_lugar_busqueda IS NULL) 
                    AND estado = 'completado' 
                    THEN 1 
                END)::float / NULLIF(COUNT(CASE WHEN encontro_estacionamiento = false THEN 1 END), 0) * 100) as tasa_georeferenciacion
            FROM historial 
            WHERE estado IN ('completado', 'cancelado')
            ${dateFilter}
            GROUP BY DATE(inicio_en)
            HAVING COUNT(*) > 0
            ORDER BY fecha DESC
            LIMIT 30
        `
        const evolucionTasasResult = await pool.query(evolucionTasasQuery)
        const evolucionTasas = evolucionTasasResult.rows
            .map((row) => ({
                fecha: new Date(row.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
                general: Number.parseFloat(row.tasa_general || 0).toFixed(1),
                destino: Number.parseFloat(row.tasa_destino || 0).toFixed(1),
                georeferenciacion: Number.parseFloat(row.tasa_georeferenciacion || 0).toFixed(1),
            }))
            .reverse()

        const weeklyQuery = `
            SELECT 
                EXTRACT(DOW FROM inicio_en) as dia_semana,
                COUNT(*) as cantidad
            FROM historial 
            WHERE estado IN ('completado', 'cancelado')
            ${dateFilter}
            GROUP BY EXTRACT(DOW FROM inicio_en)
            ORDER BY dia_semana
        `

        const weeklyResult = await pool.query(weeklyQuery)

        const viajesPorDia = [
            { dia: "Lun", viajes: 0 },
            { dia: "Mar", viajes: 0 },
            { dia: "Mié", viajes: 0 },
            { dia: "Jue", viajes: 0 },
            { dia: "Vie", viajes: 0 },
            { dia: "Sáb", viajes: 0 },
            { dia: "Dom", viajes: 0 },
        ]

        weeklyResult.rows.forEach((row) => {
            const diaIndex = row.dia_semana === "0" ? 6 : Number.parseInt(row.dia_semana) - 1
            if (diaIndex >= 0 && diaIndex < 7) {
                viajesPorDia[diaIndex].viajes = Number.parseInt(row.cantidad)
            }
        })

        const monthlyQuery = `
            SELECT 
                EXTRACT(MONTH FROM inicio_en) as mes_num,
                COUNT(*) as cantidad
            FROM historial 
            WHERE estado IN ('completado', 'cancelado')
            AND inicio_en >= NOW() - INTERVAL '12 months'
            GROUP BY mes_num
            ORDER BY mes_num
        `

        const monthlyResult = await pool.query(monthlyQuery)

        const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        const viajesPorMes = mesesNombres.map((mes, index) => ({
            mes: mes,
            viajes: 0,
        }))

        monthlyResult.rows.forEach((row) => {
            const mesIndex = Number.parseInt(row.mes_num) - 1
            if (mesIndex >= 0 && mesIndex < 12) {
                viajesPorMes[mesIndex].viajes = Number.parseInt(row.cantidad)
            }
        })

        const topCallesQuery = `
            SELECT 
                calle_estacionamiento as nombre,
                id_mapeado,
                COUNT(*) as viajes
            FROM historial 
            WHERE calle_estacionamiento IS NOT NULL
            AND estado = 'completado'
            ${dateFilter}
            GROUP BY calle_estacionamiento, id_mapeado
            ORDER BY viajes DESC
            LIMIT 5
        `

        const topCallesResult = await pool.query(topCallesQuery)

        const heatmapCallesQuery = `
            SELECT 
                m.id,
                m.restriccion as nombre,
                ST_AsGeoJSON(m.geometry) as geometry_json,
                COUNT(h.id_viaje) as viajes,
                (COUNT(h.id_viaje)::float / NULLIF((SELECT COUNT(*) FROM historial WHERE id_mapeado IS NOT NULL ${dateFilter}), 0) * 100) as intensidad
            FROM mapeado m
            LEFT JOIN historial h ON m.id = h.id_mapeado AND h.estado = 'completado' ${dateFilter}
            WHERE h.id_viaje IS NOT NULL
            GROUP BY m.id, m.restriccion, m.geometry
            HAVING COUNT(h.id_viaje) > 0
            ORDER BY viajes DESC
            LIMIT 50
        `

        const heatmapCallesResult = await pool.query(heatmapCallesQuery)

        console.log("[v0] Heatmap calles result rows:", heatmapCallesResult.rows.length)

        const heatmapData = heatmapCallesResult.rows.map((row) => {
            let latlngs = []
            try {
                const geojson = JSON.parse(row.geometry_json)
                if (geojson.type === "MultiLineString" && geojson.coordinates) {
                    latlngs = geojson.coordinates[0].map((coord) => [coord[1], coord[0]])
                } else if (geojson.type === "LineString" && geojson.coordinates) {
                    latlngs = geojson.coordinates.map((coord) => [coord[1], coord[0]])
                } else if (geojson.type === "Point" && geojson.coordinates) {
                    latlngs = [[geojson.coordinates[1], geojson.coordinates[0]]]
                }
            } catch (e) {
                console.error("Error parsing geometry JSON:", e)
            }

            console.log("[v0] Polyline:", { id: row.id, nombre: row.nombre, latlngs_count: latlngs.length })

            return {
                id: row.id,
                nombre: row.nombre || "Sin nombre",
                viajes: Number.parseInt(row.viajes),
                intensidad: Number.parseFloat(row.intensidad) || 0,
                idMapeado: row.id,
                latlngs: latlngs,
            }
        })

        const polylinesMock = heatmapData.map((item) => ({
            ...item,
            id_mapeado: item.idMapeado,
            color: getColorByIntensity(item.intensidad),
        }))

        console.log("[v0] Polylines mock count:", polylinesMock.length)

        const zonasHeatmapQuery = `
            SELECT 
                ST_Y(destino) as lat,
                ST_X(destino) as lng,
                COUNT(*) as viajes
            FROM historial 
            WHERE destino IS NOT NULL 
            AND estado = 'completado'
            ${dateFilter}
            GROUP BY destino
            ORDER BY viajes DESC
            LIMIT 30
        `

        const zonasHeatmapResult = await pool.query(zonasHeatmapQuery)

        const maxViajesZona = zonasHeatmapResult.rows.length > 0 ? Number.parseInt(zonasHeatmapResult.rows[0].viajes) : 1
        const zonasHeatmapData = zonasHeatmapResult.rows.map((row) => ({
            lat: Number.parseFloat(row.lat),
            lng: Number.parseFloat(row.lng),
            intensity: Number.parseFloat(row.viajes) / maxViajesZona,
            viajes: Number.parseInt(row.viajes),
        }))

        const trayectoriasQuery = `
            SELECT 
                id_viaje as id,
                ST_Y(origen) as origen_lat,
                ST_X(origen) as origen_lng,
                ST_Y(destino) as destino_lat,
                ST_X(destino) as destino_lng,
                ST_AsGeoJSON(trayectoria) as ruta_geojson,
                distancia_km,
                EXTRACT(EPOCH FROM (fin_en - inicio_en))/60 as duracion_minutos
            FROM historial 
            WHERE trayectoria IS NOT NULL
            AND estado = 'completado'
            ${dateFilter}
            ORDER BY inicio_en DESC
            LIMIT 100
        `

        const trayectoriasResult = await pool.query(trayectoriasQuery)

        console.log("[v0] Trayectorias result rows:", trayectoriasResult.rows.length)

        const trayectoriasMock = trayectoriasResult.rows.map((row) => {
            let ruta = []
            if (row.ruta_geojson) {
                try {
                    const geojson = JSON.parse(row.ruta_geojson)
                    if (geojson.type === "LineString" && geojson.coordinates) {
                        ruta = geojson.coordinates.map((coord) => [coord[1], coord[0]]) // [lng, lat] -> [lat, lng]
                    } else if (geojson.type === "MultiLineString" && geojson.coordinates) {
                        ruta = geojson.coordinates[0].map((coord) => [coord[1], coord[0]])
                    }
                } catch (e) {
                    console.error("Error parsing GeoJSON:", e)
                }
            }

            if (ruta.length === 0) {
                ruta = [
                    [Number.parseFloat(row.origen_lat), Number.parseFloat(row.origen_lng)],
                    [Number.parseFloat(row.destino_lat), Number.parseFloat(row.destino_lng)],
                ]
            }

            console.log("[v0] Trayectoria:", { id: row.id, ruta_length: ruta.length })

            return {
                id: row.id,
                inicio: {
                    lat: Number.parseFloat(row.origen_lat),
                    lng: Number.parseFloat(row.origen_lng),
                    nombre: "Origen",
                },
                fin: {
                    lat: Number.parseFloat(row.destino_lat),
                    lng: Number.parseFloat(row.destino_lng),
                    nombre: "Destino",
                },
                ruta: ruta,
                color: "#ff6b35",
                duracion: `${Math.round(Number.parseFloat(row.duracion_minutos))} min`,
                distancia: `${Number.parseFloat(row.distancia_km).toFixed(1)} km`,
            }
        })

        console.log("[v0] Trayectorias mock count:", trayectoriasMock.length)

        const encontroEstacionamientoQuery = `
            SELECT 
                EXTRACT(DOW FROM inicio_en) as dia_semana,
                COUNT(CASE WHEN encontro_lugar_busqueda = true THEN 1 END) as encontro,
                COUNT(CASE WHEN encontro_lugar_busqueda = false THEN 1 END) as no_encontro
            FROM historial 
            WHERE encontro_estacionamiento = false
            AND estado = 'completado'
            ${dateFilter}
            GROUP BY EXTRACT(DOW FROM inicio_en)
            ORDER BY dia_semana
        `

        const encontroResult = await pool.query(encontroEstacionamientoQuery)

        const encontroEstacionamientoPorDia = [
            { dia: "Lun", encontro: 0, noEncontro: 0 },
            { dia: "Mar", encontro: 0, noEncontro: 0 },
            { dia: "Mié", encontro: 0, noEncontro: 0 },
            { dia: "Jue", encontro: 0, noEncontro: 0 },
            { dia: "Vie", encontro: 0, noEncontro: 0 },
            { dia: "Sáb", encontro: 0, noEncontro: 0 },
            { dia: "Dom", encontro: 0, noEncontro: 0 },
        ]

        encontroResult.rows.forEach((row) => {
            const diaIndex = row.dia_semana === "0" ? 6 : Number.parseInt(row.dia_semana) - 1
            if (diaIndex >= 0 && diaIndex < 7) {
                encontroEstacionamientoPorDia[diaIndex].encontro = Number.parseInt(row.encontro)
                encontroEstacionamientoPorDia[diaIndex].noEncontro = Number.parseInt(row.no_encontro)
            }
        })

        const porcentajeExitoGeneral =
            Number.parseInt(tasaExitoGeneral.total_viajes) > 0
                ? (
                    (Number.parseInt(tasaExitoGeneral.viajes_completados) / Number.parseInt(tasaExitoGeneral.total_viajes)) *
                    100
                ).toFixed(1)
                : "0"

        const porcentajeExitoDestino =
            Number.parseInt(tasaExitoDestino.total_viajes) > 0
                ? (
                    (Number.parseInt(tasaExitoDestino.encontro_en_destino) / Number.parseInt(tasaExitoDestino.total_viajes)) *
                    100
                ).toFixed(1)
                : "0"

        const porcentajeExitoGeo =
            Number.parseInt(tasaExitoGeo.viajes_que_necesitaron_geo) > 0
                ? (
                    (Number.parseInt(tasaExitoGeo.exitos_geo) / Number.parseInt(tasaExitoGeo.viajes_que_necesitaron_geo)) *
                    100
                ).toFixed(1)
                : "0"

        const regresionHoraExitoQuery = `
            SELECT 
                EXTRACT(HOUR FROM inicio_en) as hora,
                COUNT(*) as total_viajes,
                COUNT(CASE 
                    WHEN (
                        encontro_estacionamiento = true 
                        OR (encontro_estacionamiento = false AND (encontro_lugar_busqueda = true OR encontro_lugar_busqueda IS NULL))
                    )
                    AND estado = 'completado'
                    THEN 1 
                END) as viajes_exitosos,
                ROUND(
                    (COUNT(CASE 
                        WHEN (
                            encontro_estacionamiento = true 
                            OR (encontro_estacionamiento = false AND (encontro_lugar_busqueda = true OR encontro_lugar_busqueda IS NULL))
                        )
                        AND estado = 'completado'
                        THEN 1 
                    END)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 
                    2
                ) as tasa_exito_pct
            FROM historial
            WHERE inicio_en IS NOT NULL
              ${dateFilter}
            GROUP BY EXTRACT(HOUR FROM inicio_en)
            HAVING COUNT(*) > 0
            ORDER BY hora
        `

        const regresionHoraExitoResult = await pool.query(regresionHoraExitoQuery)
        const regresionHoraExitoData = regresionHoraExitoResult.rows.map((row) => ({
            hora: Number.parseInt(row.hora),
            tasaExito: Number.parseFloat(row.tasa_exito_pct),
        }))

        let regresionHoraExito = {
            datos: regresionHoraExitoData,
            pendiente: 0,
            intercepto: 0,
            r2: 0,
            ecuacion: "",
        }

        if (regresionHoraExitoData.length >= 2) {
            const n = regresionHoraExitoData.length
            const sumX = regresionHoraExitoData.reduce((sum, d) => sum + d.hora, 0)
            const sumY = regresionHoraExitoData.reduce((sum, d) => sum + d.tasaExito, 0)
            const sumXY = regresionHoraExitoData.reduce((sum, d) => sum + d.hora * d.tasaExito, 0)
            const sumX2 = regresionHoraExitoData.reduce((sum, d) => sum + d.hora * d.hora, 0)

            const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
            const intercepto = (sumY - pendiente * sumX) / n

            const yMean = sumY / n
            const ssTotal = regresionHoraExitoData.reduce((sum, d) => sum + (d.tasaExito - yMean) ** 2, 0)
            const ssResidual = regresionHoraExitoData.reduce((sum, d) => {
                const yPred = pendiente * d.hora + intercepto
                return sum + (d.tasaExito - yPred) ** 2
            }, 0)
            const r2 = 1 - ssResidual / ssTotal

            regresionHoraExito = {
                datos: regresionHoraExitoData,
                pendiente: Number.parseFloat(pendiente.toFixed(4)),
                intercepto: Number.parseFloat(intercepto.toFixed(4)),
                r2: Number.parseFloat(r2.toFixed(4)),
                ecuacion: `y = ${pendiente.toFixed(2)}x + ${intercepto.toFixed(2)}`,
            }
        }

        const regresionTotalCompletadosQuery = `
            SELECT 
                DATE(inicio_en) as fecha,
                COUNT(*) as total_viajes,
                COUNT(CASE WHEN estado = 'completado' THEN 1 END) as viajes_completados
            FROM historial
            WHERE inicio_en IS NOT NULL
              ${dateFilter}
            GROUP BY DATE(inicio_en)
            HAVING COUNT(*) > 0
            ORDER BY fecha
        `

        const regresionTotalCompletadosResult = await pool.query(regresionTotalCompletadosQuery)
        const regresionTotalCompletadosData = regresionTotalCompletadosResult.rows.map((row) => ({
            totalViajes: Number.parseInt(row.total_viajes),
            viajesCompletados: Number.parseInt(row.viajes_completados),
        }))

        let regresionTotalCompletados = {
            datos: regresionTotalCompletadosData,
            pendiente: 0,
            intercepto: 0,
            r2: 0,
            ecuacion: "",
        }

        if (regresionTotalCompletadosData.length >= 2) {
            const n = regresionTotalCompletadosData.length

            const sumXY = regresionTotalCompletadosData.reduce((sum, d) => sum + d.totalViajes * d.viajesCompletados, 0)
            const sumX2 = regresionTotalCompletadosData.reduce((sum, d) => sum + d.totalViajes * d.totalViajes, 0)

            const pendiente = sumXY / sumX2
            const intercepto = 0

            const yMean = regresionTotalCompletadosData.reduce((sum, d) => sum + d.viajesCompletados, 0) / n
            const ssTotal = regresionTotalCompletadosData.reduce((sum, d) => sum + (d.viajesCompletados - yMean) ** 2, 0)
            const ssResidual = regresionTotalCompletadosData.reduce((sum, d) => {
                const yPred = pendiente * d.totalViajes
                return sum + (d.viajesCompletados - yPred) ** 2
            }, 0)
            const r2 = 1 - ssResidual / ssTotal

            regresionTotalCompletados = {
                datos: regresionTotalCompletadosData,
                pendiente: Number.parseFloat(pendiente.toFixed(4)),
                intercepto: 0,
                r2: Number.parseFloat(Math.max(0, r2).toFixed(4)),
                ecuacion: `y = ${pendiente.toFixed(2)}x`,
            }
        }

        res.json({
            success: true,
            stats: {
                totalViajes: Number.parseInt(stats.total_viajes),
                viajesCompletados: Number.parseInt(stats.viajes_completados),
                viajesCancelados: Number.parseInt(stats.viajes_cancelados),
                kmRecorridos: Number.parseFloat(stats.kilometros_recorridos).toFixed(1),
                minutosAhorrados: Math.round(Number.parseFloat(stats.tiempo_ahorrado)),
                tasaExito:
                    stats.viajes_con_parking > 0
                        ? ((Number.parseInt(stats.viajes_con_parking) / Number.parseInt(stats.total_viajes)) * 100).toFixed(1)
                        : "0",
                tiempoPromedioBusqueda: Number.parseFloat(stats.tiempo_promedio_busqueda || 0).toFixed(1),
                distanciaPromedio: Number.parseFloat(stats.distancia_promedio || 0).toFixed(2),
                viajesPorDia: (Number.parseInt(stats.total_viajes) / 30).toFixed(1),
            },
            viajesPorDia,
            viajesPorMes,
            topCalles: topCallesResult.rows,
            heatmapData,
            polylinesMock,
            zonasHeatmapData,
            trayectoriasMock,
            encontroEstacionamientoPorDia,
            tasasExito: {
                general: {
                    completados: Number.parseInt(tasaExitoGeneral.viajes_completados),
                    cancelados: Number.parseInt(tasaExitoGeneral.viajes_cancelados),
                    total: Number.parseInt(tasaExitoGeneral.total_viajes),
                    porcentaje: porcentajeExitoGeneral,
                },
                destino: {
                    encontroEnDestino: Number.parseInt(tasaExitoDestino.encontro_en_destino),
                    noEncontroEnDestino: Number.parseInt(tasaExitoDestino.no_encontro_en_destino),
                    total: Number.parseInt(tasaExitoDestino.total_viajes),
                    porcentaje: porcentajeExitoDestino,
                },
                georeferenciacion: {
                    exitosGeo: Number.parseInt(tasaExitoGeo.exitos_geo),
                    fallosGeo: Number.parseInt(tasaExitoGeo.fallos_geo),
                    total: Number.parseInt(tasaExitoGeo.viajes_que_necesitaron_geo),
                    porcentaje: porcentajeExitoGeo,
                },
            },
            evolucionTasas,
            porcentajeExito: {
                encontro: Number.parseInt(stats.viajes_con_parking),
                noEncontro: Number.parseInt(stats.viajes_sin_parking),
                porcentajeEncontro:
                    stats.viajes_con_parking > 0
                        ? ((Number.parseInt(stats.viajes_con_parking) / Number.parseInt(stats.total_viajes)) * 100).toFixed(1)
                        : "0",
                porcentajeNoEncontro:
                    stats.viajes_sin_parking > 0
                        ? ((Number.parseInt(stats.viajes_sin_parking) / Number.parseInt(stats.total_viajes)) * 100).toFixed(1)
                        : "0",
            },
            regresionHoraExito,
            regresionTotalCompletados,
        })
    } catch (error) {
        console.error("Error obteniendo estadísticas:", error)
        res.status(500).json({
            success: false,
            message: "Error interno del servidor",
            error: error.message,
        })
    }
})

app.listen(PORT, () => console.log(`server on port ${PORT}`))
