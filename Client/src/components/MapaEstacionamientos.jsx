"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { MapContainer, TileLayer, FeatureGroup, Polyline, Popup } from "react-leaflet"
import { EditControl } from "react-leaflet-draw"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"
import axios from "axios"

const MapaEstacionamientos = () => {
    const [mapLayers, setMapLayers] = useState([])
    const [center, setCenter] = useState({ lat: -17.389675468353254, lng: -66.15497157617803 })
    const [currentLayer, setCurrentLayer] = useState(null)
    const [modal, setModal] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })
    const [filter, setFilter] = useState("Todos")
    const [leafletIdToDbId, setLeafletIdToDbId] = useState({})
    const [isEditMode, setIsEditMode] = useState(false)
    const [editRenderLimit, setEditRenderLimit] = useState(null)
    const nextDbIdRef = useRef(null)
    const ZOOM_LEVEL = 17
    const mapRef = useRef()
    const featureGroupRef = useRef()

    const common = {
        headers: {
            "ngrok-skip-browser-warning": "true",
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        timeout: 15000,
    }

    const getColorFromRestriction = (restriction) => {
        const colorMap = {
            "ESTACIONAMIENTO PROHIBIDO": "#ef4444",
            "ESTACIONAMIENTO TARIFADO": "#3b82f6",
            "ESTACIONAMIENTO TRANSPORTE PÚBLICO": "#f59e0b",
            "ESTACIONAMIENTO PERSONAS CON DISCAPACIDAD": "#8b5cf6",
            "ESTACIONAMIENTO DESCARGUE DE MERCADERÍA": "#10b981",
            "ESTACIONAMIENTO VEHÍCULOS OFICIALES": "#facc15",
            "ESTACIONAMIENTO ESPECIAL VEHÍCULOS ELÉCTRICOS": "#84cc16",
        }
        return colorMap[restriction] || "#6b7280"
    }

    const getIconFromRestriction = (restriction) => {
        const iconMap = {
            "ESTACIONAMIENTO PROHIBIDO": "🚫",
            "ESTACIONAMIENTO TARIFADO": "🅿️",
            "ESTACIONAMIENTO TRANSPORTE PÚBLICO": "🚌",
            "ESTACIONAMIENTO PERSONAS CON DISCAPACIDAD": "♿",
            "ESTACIONAMIENTO DESCARGUE DE MERCADERÍA": "📦",
            "ESTACIONAMIENTO VEHÍCULOS OFICIALES": "🚓",
            "ESTACIONAMIENTO ESPECIAL VEHÍCULOS ELÉCTRICOS": "⚡",
        }
        return iconMap[restriction] || "🅿"
    }

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/mapeado`, common)
                const data = response.data.filter((layer) => layer.type === "polyline")

                console.log("[v0] ===== FETCH DATA DEBUG =====")
                console.log("[v0] Total layers received:", response.data.length)
                console.log("[v0] Polyline layers:", data.length)
                console.log("[v0] First 5 layers:", data.slice(0, 5))

                const allIds = data.map((l) => l.id)
                console.log("[v0] All IDs:", allIds)

                const validIds = allIds.filter((id) => id != null && !isNaN(id))
                console.log("[v0] Valid IDs:", validIds)
                console.log("[v0] Valid IDs count:", validIds.length)

                const maxId = validIds.length > 0 ? Math.max(...validIds) : 6385
                const nextId = maxId + 1

                console.log("[v0] Max ID found:", maxId)
                console.log("[v0] Next ID will be:", nextId)
                console.log("[v0] ===== END FETCH DATA DEBUG =====")

                nextDbIdRef.current = nextId

                setMapLayers(data)

                console.log("[v0] Loaded layers:", data.length)
                console.log("[v0] Valid IDs count:", validIds.length)
                console.log("[v0] Max ID found:", maxId)
                console.log("[v0] Next ID will be:", nextId)
            } catch (error) {
                console.error("[v0] Error fetching estacionamientos:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

    useEffect(() => {
        if (!mapRef.current) return

        const map = mapRef.current

        const handleEditStart = async () => {
            console.log("[v0] Edit mode activated")
            setIsEditMode(true)

            const totalLayers = mapLayers.filter((layer) => filter === "Todos" || layer.restriction === filter).length

            // If more than 1000 layers, process in batches
            if (totalLayers > 1000) {
                setIsLoading(true)
                setLoadingProgress({ current: 0, total: Math.ceil(totalLayers / 500) })

                // Start with 500 layers
                setEditRenderLimit(500)

                // Gradually increase the limit
                for (let i = 1000; i <= totalLayers; i += 500) {
                    await new Promise((resolve) => setTimeout(resolve, 100))
                    setEditRenderLimit(i)
                    setLoadingProgress({ current: Math.ceil(i / 500), total: Math.ceil(totalLayers / 500) })
                }

                setEditRenderLimit(null)
                setIsLoading(false)
                setLoadingProgress({ current: 0, total: 0 })
            }
        }

        const handleEditStop = () => {
            console.log("[v0] Edit mode deactivated")
            setIsEditMode(false)
            setEditRenderLimit(null)
        }

        // Listen for Leaflet Draw events
        map.on("draw:editstart", handleEditStart)
        map.on("draw:editstop", handleEditStop)
        map.on("draw:deletestart", handleEditStart)
        map.on("draw:deletestop", handleEditStop)

        return () => {
            map.off("draw:editstart", handleEditStart)
            map.off("draw:editstop", handleEditStop)
            map.off("draw:deletestart", handleEditStart)
            map.off("draw:deletestop", handleEditStop)
        }
    }, [mapRef.current, mapLayers, filter])

    useEffect(() => {
        if (featureGroupRef.current && mapLayers.length > 0) {
            const newMapping = {}
            featureGroupRef.current.eachLayer((layer) => {
                const matchingLayer = mapLayers.find((ml) => {
                    if (!layer.getLatLngs) return false
                    const layerLatLngs = layer.getLatLngs()
                    if (layerLatLngs.length === 0) return false

                    const firstCoord = layerLatLngs[0]
                    const mlFirstCoord = ml.latlngs[0]

                    return (
                        Math.abs(firstCoord.lat - mlFirstCoord[0]) < 0.0001 && Math.abs(firstCoord.lng - mlFirstCoord[1]) < 0.0001
                    )
                })

                if (matchingLayer) {
                    newMapping[layer._leaflet_id] = matchingLayer.id
                    console.log("[v0] Mapped Leaflet ID", layer._leaflet_id, "to DB ID", matchingLayer.id)
                }
            })
            setLeafletIdToDbId(newMapping)
        }
    }, [mapLayers])

    const handleCreate = (e) => {
        const { layer } = e

        console.log("[v0] ===== CREATE DEBUG =====")
        console.log("[v0] Current nextDbId:", nextDbIdRef.current)
        console.log("[v0] nextDbId type:", typeof nextDbIdRef.current)
        console.log("[v0] nextDbId is null?", nextDbIdRef.current === null)
        console.log("[v0] nextDbId is NaN?", isNaN(nextDbIdRef.current))

        const newLayer = {
            id: nextDbIdRef.current,
            type: "polyline",
            latlngs: layer.getLatLngs().map((point) => ({ lat: point.lat, lng: point.lng })),
            restriction: null,
        }

        console.log("[v0] New layer created:", newLayer)
        console.log("[v0] ===== END CREATE DEBUG =====")

        setCurrentLayer(newLayer)
        setModal(true)
    }

    const processInBatches = async (items, batchSize, processFn) => {
        const batches = []
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize))
        }

        const results = []
        for (let i = 0; i < batches.length; i++) {
            setLoadingProgress({ current: i + 1, total: batches.length })

            await new Promise((resolve) => setTimeout(resolve, 50))

            const batchResults = await Promise.all(batches[i].map(processFn))
            results.push(...batchResults)
        }

        return results
    }

    const handleEdit = async (e) => {
        const {
            layers: { _layers },
        } = e

        const layersArray = Object.values(_layers)

        if (layersArray.length === 0) return

        setIsLoading(true)
        setLoadingProgress({ current: 0, total: 0 })

        try {
            const results = await processInBatches(layersArray, 500, async (layer) => {
                const dbId = leafletIdToDbId[layer._leaflet_id]

                if (!dbId) {
                    console.error("No DB ID found for Leaflet ID:", layer._leaflet_id)
                    return null
                }

                const updatedLayer = {
                    id: dbId,
                    latlngs: layer.getLatLngs().map((point) => ({ lat: point.lat, lng: point.lng })),
                    type: "polyline",
                    restriction: mapLayers.find((l) => l.id === dbId)?.restriction || null,
                }

                await axios.put(`${process.env.REACT_APP_API_URL}/mapeado/${dbId}`, updatedLayer, common)
                return { dbId, updatedLayer }
            })

            setMapLayers((prev) =>
                prev.map((l) => {
                    const result = results.find((r) => r && r.dbId === l.id)
                    return result ? result.updatedLayer : l
                }),
            )
        } catch (error) {
            console.error("Error updating estacionamiento:", error)
            alert("Error al actualizar el estacionamiento")
        } finally {
            setIsLoading(false)
            setLoadingProgress({ current: 0, total: 0 })
        }
    }

    const handleDelete = async (e) => {
        const {
            layers: { _layers },
        } = e

        const layersArray = Object.values(_layers)

        if (layersArray.length === 0) return

        setIsLoading(true)
        setLoadingProgress({ current: 0, total: 0 })

        try {
            const results = await processInBatches(layersArray, 500, async (layer) => {
                const dbId = leafletIdToDbId[layer._leaflet_id]

                if (!dbId) {
                    console.error("No DB ID found for Leaflet ID:", layer._leaflet_id)
                    return null
                }

                await axios.delete(`${process.env.REACT_APP_API_URL}/mapeado/${dbId}`, common)
                return { dbId, leafletId: layer._leaflet_id }
            })

            setMapLayers((prev) => prev.filter((l) => !results.some((r) => r && r.dbId === l.id)))

            setLeafletIdToDbId((prev) => {
                const newMapping = { ...prev }
                results.forEach((r) => {
                    if (r) delete newMapping[r.leafletId]
                })
                return newMapping
            })
        } catch (error) {
            console.error("Error deleting estacionamiento:", error)
            alert("Error al eliminar el estacionamiento")
        } finally {
            setIsLoading(false)
            setLoadingProgress({ current: 0, total: 0 })
        }
    }

    const confirmModal = async () => {
        if (!currentLayer.restriction) {
            alert("Por favor selecciona un tipo de restricción")
            return
        }

        console.log("[v0] ===== CONFIRM MODAL DEBUG =====")
        console.log("[v0] Current layer:", currentLayer)
        console.log("[v0] Current layer ID:", currentLayer.id)
        console.log("[v0] Current layer ID type:", typeof currentLayer.id)
        console.log("[v0] nextDbId:", nextDbIdRef.current)

        if (!currentLayer.id || currentLayer.id === null || isNaN(currentLayer.id)) {
            alert("Error: No se pudo generar un ID válido. Por favor recarga la página.")
            console.error("[v0] Invalid currentLayer.id:", currentLayer.id)
            console.log("[v0] ===== END CONFIRM MODAL DEBUG =====")
            return
        }

        setIsLoading(true)
        try {
            console.log("[v0] Sending POST request with data:", currentLayer)
            console.log("[v0] POST URL:", `${process.env.REACT_APP_API_URL}/mapeado`)

            const response = await axios.post(`${process.env.REACT_APP_API_URL}/mapeado`, currentLayer, common)

            console.log("[v0] POST response:", response.data)

            setMapLayers((prev) => [...prev, currentLayer])
            nextDbIdRef.current = nextDbIdRef.current + 1

            setModal(false)
            setCurrentLayer(null)

            console.log("[v0] Layer saved successfully. Next ID:", nextDbIdRef.current + 1)
            console.log("[v0] ===== END CONFIRM MODAL DEBUG =====")
        } catch (error) {
            console.error("[v0] Error saving estacionamiento:", error)
            console.error("[v0] Error response:", error.response?.data)
            console.log("[v0] ===== END CONFIRM MODAL DEBUG =====")
            alert("Error al guardar el estacionamiento: " + (error.response?.data?.message || error.message))
        } finally {
            setIsLoading(false)
        }
    }

    const displayedLayers = useMemo(() => {
        const filtered = mapLayers.filter((layer) => filter === "Todos" || layer.restriction === filter)

        // Apply edit render limit if in edit mode
        if (isEditMode && editRenderLimit !== null && filtered.length > editRenderLimit) {
            return filtered.slice(0, editRenderLimit)
        }

        return filtered
    }, [mapLayers, filter, isEditMode, editRenderLimit])

    return (
        <>
            <div style={{ marginBottom: "10px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <select
                    value={filter}
                    onChange={(e) => {
                        setFilter(e.target.value)
                        // setRenderLimit(null) // Removed due to undeclared variable error
                    }}
                    style={{
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        fontSize: "1rem",
                    }}
                >
                    <option value="Todos">🔎 Mostrar Todos</option>
                    {[...new Set(mapLayers.map((layer) => layer.restriction))]
                        .filter((r) => r)
                        .map((restriction) => (
                            <option key={restriction} value={restriction}>
                                {getIconFromRestriction(restriction)} {restriction}
                            </option>
                        ))}
                </select>

                <span style={{ fontSize: "0.9rem", color: "#666" }}>
                    Mostrando {displayedLayers.length} de {mapLayers.length} líneas
                </span>

                {/* Removed the "Preparar Edición" button */}
            </div>

            {/* Removed the warning message about too many lines */}

            <div style={styles.mapWrapper}>
                {isLoading && (
                    <div style={styles.loadingOverlay}>
                        <div style={styles.spinner}></div>
                        <span style={styles.loadingText}>
                            {loadingProgress.total > 0
                                ? `Procesando lote ${loadingProgress.current} de ${loadingProgress.total}...`
                                : "Procesando..."}
                        </span>
                    </div>
                )}

                <MapContainer center={center} zoom={ZOOM_LEVEL} ref={mapRef} style={styles.map} className="custom-map">
                    <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                    <FeatureGroup ref={featureGroupRef}>
                        <EditControl
                            position="topright"
                            onCreated={handleCreate}
                            onEdited={handleEdit}
                            onDeleted={handleDelete}
                            draw={{
                                rectangle: false,
                                polygon: false,
                                circle: false,
                                circlemarker: false,
                                marker: false,
                                polyline: {
                                    shapeOptions: {
                                        color: "#ff6b35",
                                        weight: 4,
                                        opacity: 0.8,
                                    },
                                },
                            }}
                        />
                        {displayedLayers.map((layer) => (
                            <Polyline
                                key={layer.id}
                                positions={layer.latlngs}
                                color={getColorFromRestriction(layer.restriction)}
                                weight={5}
                                opacity={0.8}
                            >
                                <Popup className="custom-popup">
                                    <div style={styles.popupContent}>
                                        <div style={styles.popupIcon}>{getIconFromRestriction(layer.restriction)}</div>
                                        <div style={styles.popupText}>
                                            <strong>{layer.restriction || "Sin restricción"}</strong>
                                            <br />
                                            <small>ID: {layer.id}</small>
                                        </div>
                                    </div>
                                </Popup>
                            </Polyline>
                        ))}
                    </FeatureGroup>
                </MapContainer>

                <div style={styles.legend}>
                    <h3 style={styles.legendTitle}>Descripción de Líneas</h3>
                    <div style={styles.legendItems}>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#ef4444" }}></div>
                            <span>🚫 Estacionamiento Prohibido</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#3b82f6" }}></div>
                            <span>🅿️ Estacionamiento Tarifado</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#f59e0b" }}></div>
                            <span>🚌 Transporte Público</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#8b5cf6" }}></div>
                            <span>♿ Discapacidad</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#10b981" }}></div>
                            <span>📦 Descarga Mercadería</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#facc15" }}></div>
                            <span>🚓 Vehículos Oficiales</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#84cc16" }}></div>
                            <span>⚡ Vehículos Eléctricos</span>
                        </div>
                    </div>
                </div>
            </div>

            {modal && (
                <>
                    <div style={styles.modalOverlay} onClick={() => setModal(false)}></div>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                <span style={styles.modalIcon}>🗺️</span>
                                Tipo de Restricción
                            </h2>
                            <button style={styles.closeButton} onClick={() => setModal(false)}>
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalContent}>
                            <p style={styles.modalDescription}>
                                Selecciona el tipo de restricción para esta línea de estacionamiento:
                            </p>
                            <div style={styles.selectWrapper}>
                                <select
                                    style={styles.select}
                                    onChange={(e) => setCurrentLayer({ ...currentLayer, restriction: e.target.value })}
                                    value={currentLayer?.restriction || ""}
                                >
                                    <option value="">Selecciona una opción</option>
                                    <option value="ESTACIONAMIENTO PROHIBIDO">🚫 Estacionamiento Prohibido</option>
                                    <option value="ESTACIONAMIENTO TARIFADO">🅿️ Estacionamiento Tarifado</option>
                                    <option value="ESTACIONAMIENTO TRANSPORTE PÚBLICO">🚌 Estacionamiento Transporte Público</option>
                                    <option value="ESTACIONAMIENTO PERSONAS CON DISCAPACIDAD">
                                        ♿ Estacionamiento Personas con Discapacidad
                                    </option>
                                    <option value="ESTACIONAMIENTO DESCARGUE DE MERCADERÍA">
                                        📦 Estacionamiento Descargue de Mercadería
                                    </option>
                                    <option value="ESTACIONAMIENTO VEHÍCULOS OFICIALES">🚓 Estacionamiento Vehículos Oficiales</option>
                                    <option value="ESTACIONAMIENTO ESPECIAL VEHÍCULOS ELÉCTRICOS">
                                        ⚡ Estacionamiento Especial Vehículos Eléctricos
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div style={styles.modalActions}>
                            <button style={styles.cancelButton} onClick={() => setModal(false)} disabled={isLoading}>
                                Cancelar
                            </button>
                            <button
                                style={{ ...styles.confirmButton, ...(isLoading ? styles.buttonDisabled : {}) }}
                                onClick={confirmModal}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <div style={styles.buttonSpinner}></div>Guardando...
                                    </>
                                ) : (
                                    <>✓ Confirmar</>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    )
}

export default MapaEstacionamientos

const styles = {
    mapWrapper: {
        position: "relative",
        height: "100%",
        width: "100%",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
        border: "2px solid rgba(255, 107, 53, 0.2)",
    },
    map: {
        height: "100%",
        width: "100%",
        borderRadius: "20px",
    },
    loadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        borderRadius: "20px",
    },
    spinner: {
        width: "40px",
        height: "40px",
        border: "4px solid rgba(255, 107, 53, 0.3)",
        borderTop: "4px solid #ff6b35",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: "16px",
    },
    loadingText: {
        color: "#ffffff",
        fontSize: "1.1rem",
        fontWeight: "600",
    },
    legend: {
        position: "absolute",
        bottom: "20px",
        left: "20px",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
        border: "1px solid rgba(255, 107, 53, 0.2)",
        zIndex: 1000,
        minWidth: "200px",
    },
    legendTitle: {
        fontSize: "1.1rem",
        fontWeight: "700",
        color: "#000000",
        marginBottom: "16px",
        margin: "0 0 16px 0",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    legendItems: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    legendItem: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontSize: "0.9rem",
        color: "#000000",
        fontWeight: "500",
    },
    legendColor: {
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        border: "2px solid rgba(0, 0, 0, 0.1)",
    },
    popupContent: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px",
    },
    popupIcon: {
        fontSize: "1.5rem",
    },
    popupText: {
        fontSize: "0.95rem",
        color: "#000000",
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(5px)",
        zIndex: 1500,
    },
    modal: {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
        zIndex: 1600,
        width: "90%",
        maxWidth: "500px",
        border: "2px solid rgba(255, 107, 53, 0.2)",
        overflow: "hidden",
    },
    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "24px 24px 0 24px",
        borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
        paddingBottom: "16px",
        marginBottom: "20px",
    },
    modalTitle: {
        fontSize: "1.5rem",
        fontWeight: "700",
        color: "#000000",
        margin: 0,
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },
    modalIcon: {
        fontSize: "1.8rem",
    },
    closeButton: {
        background: "none",
        border: "none",
        fontSize: "1.5rem",
        color: "#6b7280",
        cursor: "pointer",
        padding: "8px",
        borderRadius: "50%",
        transition: "all 0.3s ease",
        width: "40px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    modalContent: {
        padding: "0 24px 24px 24px",
    },
    modalDescription: {
        fontSize: "1rem",
        color: "#666",
        marginBottom: "20px",
        lineHeight: "1.5",
        margin: "0 0 20px 0",
    },
    selectWrapper: {
        position: "relative",
        marginBottom: "24px",
    },
    select: {
        width: "100%",
        padding: "16px 20px",
        fontSize: "1rem",
        border: "2px solid #e5e7eb",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        color: "#000000",
        outline: "none",
        transition: "all 0.3s ease",
        appearance: "none",
        backgroundImage:
            'url(\'data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><path fill="%23666" d="M2 0L0 2h4zm0 5L0 3h4z"/></svg>\')',
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 16px center",
        backgroundSize: "12px",
    },
    modalActions: {
        display: "flex",
        gap: "12px",
        padding: "24px",
        borderTop: "1px solid rgba(0, 0, 0, 0.1)",
        justifyContent: "flex-end",
    },
    cancelButton: {
        padding: "12px 24px",
        fontSize: "1rem",
        fontWeight: "600",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        color: "#6b7280",
        cursor: "pointer",
        transition: "all 0.3s ease",
    },
    confirmButton: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 24px",
        fontSize: "1rem",
        fontWeight: "600",
        border: "none",
        borderRadius: "12px",
        backgroundColor: "#ff6b35",
        color: "#ffffff",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 4px 15px rgba(255, 107, 53, 0.3)",
    },
    buttonDisabled: {
        opacity: 0.7,
        cursor: "not-allowed",
    },
    buttonSpinner: {
        width: "16px",
        height: "16px",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        borderTop: "2px solid #ffffff",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
    },
}

if (typeof document !== "undefined") {
    const styleSheet = document.createElement("style")
    styleSheet.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .custom-map .leaflet-control-container .leaflet-top.leaflet-right {
            top: 80px;
            right: 20px;
        }
        
        .custom-map .leaflet-draw-toolbar {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            border: 1px solid rgba(255, 107, 53, 0.2);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .custom-map .leaflet-draw-toolbar a {
            border-radius: 8px;
            margin: 4px;
            transition: all 0.3s ease;
        }
        
        .custom-map .leaflet-draw-toolbar a:hover {
            background-color: rgba(255, 107, 53, 0.1);
            border-color: #ff6b35;
        }
        
        .custom-popup .leaflet-popup-content-wrapper {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            border: 1px solid rgba(255, 107, 53, 0.2);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .custom-popup .leaflet-popup-tip {
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(255, 107, 53, 0.2);
        }
        
        .modal-close-button:hover {
            background-color: rgba(239, 68, 68, 0.1);
            color: #ef4444;
        }
        
        .cancel-button:hover {
            background-color: #f3f4f6;
            border-color: #d1d5db;
        }
        
        .confirm-button:hover:not(:disabled) {
            background-color: #e55a2b;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
        }
        
        .select:focus {
            border-color: #ff6b35;
            box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }
    `
    document.head.appendChild(styleSheet)
}
