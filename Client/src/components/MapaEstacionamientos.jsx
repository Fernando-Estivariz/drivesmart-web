"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { MapContainer, TileLayer, FeatureGroup, Polyline, Popup } from "react-leaflet"
import { EditControl } from "react-leaflet-draw"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"
import axios from "axios"
import {
    MdLocationOn,
    MdEdit,
    MdDelete,
    MdWarning,
    MdClose,
    MdCheck,
    MdLocalParking,
    MdDoNotDisturb,
    MdDirectionsBus,
    MdAccessible,
    MdLocalShipping,
    MdLocalPolice,
    MdElectricCar,
    MdAdjust,
} from "react-icons/md"

const MapaEstacionamientos = () => {
    const [mapLayers, setMapLayers] = useState([])
    const [center, setCenter] = useState({ lat: -17.389675468353254, lng: -66.15497157617803 })
    const [currentLayer, setCurrentLayer] = useState(null)
    const [modal, setModal] = useState(false)
    const [editModal, setEditModal] = useState(false)
    const [selectedLayer, setSelectedLayer] = useState(null)
    const [isEditingLine, setIsEditingLine] = useState(false)
    const [editableLineRef, setEditableLineRef] = useState(null)
    const [deleteConfirmModal, setDeleteConfirmModal] = useState(false)
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
            "ESTACIONAMIENTO PROHIBIDO": <MdDoNotDisturb size={20} />,
            "ESTACIONAMIENTO TARIFADO": <MdLocalParking size={20} />,
            "ESTACIONAMIENTO TRANSPORTE PÚBLICO": <MdDirectionsBus size={20} />,
            "ESTACIONAMIENTO PERSONAS CON DISCAPACIDAD": <MdAccessible size={20} />,
            "ESTACIONAMIENTO DESCARGUE DE MERCADERÍA": <MdLocalShipping size={20} />,
            "ESTACIONAMIENTO VEHÍCULOS OFICIALES": <MdLocalPolice size={20} />,
            "ESTACIONAMIENTO ESPECIAL VEHÍCULOS ELÉCTRICOS": <MdElectricCar size={20} />,
        }
        return iconMap[restriction] || <MdLocalParking size={20} />
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

            if (totalLayers > 1000) {
                setIsLoading(true)
                setLoadingProgress({ current: 0, total: Math.ceil(totalLayers / 500) })

                setEditRenderLimit(500)

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

    const handleLineClick = (layer) => {
        console.log("[v0] Line clicked:", layer)
        setSelectedLayer(layer)
        setEditModal(true)
        setIsEditingLine(false)
    }

    const enableLineEditing = () => {
        if (!selectedLayer || !mapRef.current) return

        setIsEditingLine(true)

        featureGroupRef.current.eachLayer((leafletLayer) => {
            if (!leafletLayer.getLatLngs) return

            const layerLatLngs = leafletLayer.getLatLngs()
            if (layerLatLngs.length === 0) return

            const firstCoord = layerLatLngs[0]
            const selectedFirstCoord = selectedLayer.latlngs[0]

            if (
                Math.abs(firstCoord.lat - selectedFirstCoord[0]) < 0.0001 &&
                Math.abs(firstCoord.lng - selectedFirstCoord[1]) < 0.0001
            ) {
                if (leafletLayer.editing) {
                    leafletLayer.editing.enable()
                    setEditableLineRef(leafletLayer)
                    console.log("[v0] Editing enabled for layer:", selectedLayer.id)
                }
            }
        })
    }

    const saveLineEdit = async () => {
        if (!selectedLayer) return

        setIsLoading(true)
        try {
            let updatedLatLngs = selectedLayer.latlngs

            if (isEditingLine && editableLineRef) {
                updatedLatLngs = editableLineRef.getLatLngs().map((point) => [point.lat, point.lng])

                if (editableLineRef.editing) {
                    editableLineRef.editing.disable()
                }
            }

            const updatedLayer = {
                id: selectedLayer.id,
                latlngs: updatedLatLngs,
                type: "polyline",
                restriction: selectedLayer.restriction,
            }

            await axios.put(`${process.env.REACT_APP_API_URL}/mapeado/${selectedLayer.id}`, updatedLayer, common)

            setMapLayers((prev) => prev.map((l) => (l.id === selectedLayer.id ? updatedLayer : l)))

            setEditModal(false)
            setSelectedLayer(null)
            setIsEditingLine(false)
            setEditableLineRef(null)

            console.log("[v0] Line updated successfully:", selectedLayer.id)
        } catch (error) {
            console.error("[v0] Error updating line:", error)
            alert("Error al actualizar la línea: " + (error.response?.data?.message || error.message))
        } finally {
            setIsLoading(false)
        }
    }

    const deleteSelectedLine = async () => {
        if (!selectedLayer) return

        setDeleteConfirmModal(true)
    }

    const confirmDeleteLine = async () => {
        if (!selectedLayer) return

        setDeleteConfirmModal(false)
        setIsLoading(true)
        try {
            await axios.delete(`${process.env.REACT_APP_API_URL}/mapeado/${selectedLayer.id}`, common)

            setMapLayers((prev) => prev.filter((l) => l.id !== selectedLayer.id))

            setEditModal(false)
            setSelectedLayer(null)
            setIsEditingLine(false)
            setEditableLineRef(null)

            console.log("[v0] Line deleted successfully:", selectedLayer.id)
        } catch (error) {
            console.error("[v0] Error deleting line:", error)
            alert("Error al eliminar la línea: " + (error.response?.data?.message || error.message))
        } finally {
            setIsLoading(false)
        }
    }

    const confirmModal = async () => {
        if (!currentLayer || !currentLayer.restriction) {
            alert("Por favor selecciona un tipo de restricción")
            return
        }

        if (nextDbIdRef.current === null || isNaN(nextDbIdRef.current)) {
            console.error("[v0] Invalid ID:", nextDbIdRef.current)
            alert("Error: ID inválido. Por favor recarga la página.")
            return
        }

        setIsLoading(true)
        try {
            const payload = {
                id: currentLayer.id || nextDbIdRef.current,
                latlngs: currentLayer.latlngs,
                type: currentLayer.type,
                restriction: currentLayer.restriction,
            }

            console.log("[v0] Saving new estacionamiento with payload:", payload)

            const response = await axios.post(`${process.env.REACT_APP_API_URL}/mapeado`, payload, common)

            console.log("[v0] Response:", response.data)

            setMapLayers((prev) => [...prev, currentLayer])

            nextDbIdRef.current = nextDbIdRef.current + 1

            setModal(false)
            setCurrentLayer(null)
        } catch (error) {
            console.error("[v0] Error saving estacionamiento:", error)
            console.error("[v0] Error details:", error.response?.data)
            alert("Error al guardar el estacionamiento: " + (error.response?.data?.message || error.message))
        } finally {
            setIsLoading(false)
        }
    }

    const displayedLayers = useMemo(() => {
        const filtered = mapLayers.filter((layer) => filter === "Todos" || layer.restriction === filter)

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
                    }}
                    style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        fontSize: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <option value="Todos">Mostrar Todos</option>
                    {[...new Set(mapLayers.map((layer) => layer.restriction))]
                        .filter((r) => r)
                        .map((restriction) => (
                            <option key={restriction} value={restriction}>
                                {restriction}
                            </option>
                        ))}
                </select>

                <span style={{ fontSize: "0.9rem", color: "#666" }}>
                    Mostrando {displayedLayers.length} de {mapLayers.length} líneas
                </span>
            </div>

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
                            edit={{
                                edit: false,
                                remove: false,
                            }}
                        />
                        {displayedLayers.map((layer) => (
                            <Polyline
                                key={layer.id}
                                positions={layer.latlngs}
                                color={getColorFromRestriction(layer.restriction)}
                                weight={5}
                                opacity={0.8}
                                eventHandlers={{
                                    click: () => handleLineClick(layer),
                                }}
                            >
                                <Popup className="custom-popup">
                                    <div style={styles.popupContent}>
                                        <div style={styles.popupIcon}>{getIconFromRestriction(layer.restriction)}</div>
                                        <div style={styles.popupText}>
                                            <strong>{layer.restriction || "Sin restricción"}</strong>
                                            <br />
                                            <small>ID: {layer.id}</small>
                                            <br />
                                            <small style={{ color: "#ff6b35", fontWeight: "600" }}>Click para editar</small>
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
                            <MdDoNotDisturb size={18} style={{ color: "#ef4444" }} />
                            <span>Estacionamiento Prohibido</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#3b82f6" }}></div>
                            <MdLocalParking size={18} style={{ color: "#3b82f6" }} />
                            <span>Estacionamiento Tarifado</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#f59e0b" }}></div>
                            <MdDirectionsBus size={18} style={{ color: "#f59e0b" }} />
                            <span>Transporte Público</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#8b5cf6" }}></div>
                            <MdAccessible size={18} style={{ color: "#8b5cf6" }} />
                            <span>Discapacidad</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#10b981" }}></div>
                            <MdLocalShipping size={18} style={{ color: "#10b981" }} />
                            <span>Descarga Mercadería</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#facc15" }}></div>
                            <MdLocalPolice size={18} style={{ color: "#facc15" }} />
                            <span>Vehículos Oficiales</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#84cc16" }}></div>
                            <MdElectricCar size={18} style={{ color: "#84cc16" }} />
                            <span>Vehículos Eléctricos</span>
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
                                <MdLocationOn size={28} style={{ color: "#ff6b35" }} />
                                Tipo de Restricción
                            </h2>
                            <button style={styles.closeButton} onClick={() => setModal(false)}>
                                <MdClose size={24} />
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
                                    <option value="ESTACIONAMIENTO PROHIBIDO">Estacionamiento Prohibido</option>
                                    <option value="ESTACIONAMIENTO TARIFADO">Estacionamiento Tarifado</option>
                                    <option value="ESTACIONAMIENTO TRANSPORTE PÚBLICO">Estacionamiento Transporte Público</option>
                                    <option value="ESTACIONAMIENTO PERSONAS CON DISCAPACIDAD">
                                        Estacionamiento Personas con Discapacidad
                                    </option>
                                    <option value="ESTACIONAMIENTO DESCARGUE DE MERCADERÍA">
                                        Estacionamiento Descargue de Mercadería
                                    </option>
                                    <option value="ESTACIONAMIENTO VEHÍCULOS OFICIALES">Estacionamiento Vehículos Oficiales</option>
                                    <option value="ESTACIONAMIENTO ESPECIAL VEHÍCULOS ELÉCTRICOS">
                                        Estacionamiento Especial Vehículos Eléctricos
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
                                    <>
                                        <MdCheck size={20} /> Confirmar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {editModal && selectedLayer && (
                <>
                    {!isEditingLine && (
                        <div
                            style={styles.modalOverlay}
                            onClick={() => {
                                if (isEditingLine && editableLineRef?.editing) {
                                    editableLineRef.editing.disable()
                                }
                                setEditModal(false)
                                setSelectedLayer(null)
                                setIsEditingLine(false)
                                setEditableLineRef(null)
                            }}
                        ></div>
                    )}
                    <div style={isEditingLine ? styles.modalMinimized : styles.modal}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                <MdEdit size={28} style={{ color: "#ff6b35" }} />
                                Editar Línea
                            </h2>
                            <button
                                style={styles.closeButton}
                                onClick={() => {
                                    if (isEditingLine && editableLineRef?.editing) {
                                        editableLineRef.editing.disable()
                                    }
                                    setEditModal(false)
                                    setSelectedLayer(null)
                                    setIsEditingLine(false)
                                    setEditableLineRef(null)
                                }}
                            >
                                <MdClose size={24} />
                            </button>
                        </div>

                        {!isEditingLine && (
                            <>
                                <div style={styles.modalContent}>
                                    <p style={styles.modalDescription}>
                                        ID: {selectedLayer.id} • {selectedLayer.restriction}
                                    </p>

                                    <div style={styles.selectWrapper}>
                                        <label style={styles.label}>Tipo de Restricción:</label>
                                        <select
                                            style={styles.select}
                                            onChange={(e) => setSelectedLayer({ ...selectedLayer, restriction: e.target.value })}
                                            value={selectedLayer.restriction || ""}
                                        >
                                            <option value="">Selecciona una opción</option>
                                            <option value="ESTACIONAMIENTO PROHIBIDO">Estacionamiento Prohibido</option>
                                            <option value="ESTACIONAMIENTO TARIFADO">Estacionamiento Tarifado</option>
                                            <option value="ESTACIONAMIENTO TRANSPORTE PÚBLICO">Estacionamiento Transporte Público</option>
                                            <option value="ESTACIONAMIENTO PERSONAS CON DISCAPACIDAD">
                                                Estacionamiento Personas con Discapacidad
                                            </option>
                                            <option value="ESTACIONAMIENTO DESCARGUE DE MERCADERÍA">
                                                Estacionamiento Descargue de Mercadería
                                            </option>
                                            <option value="ESTACIONAMIENTO VEHÍCULOS OFICIALES">Estacionamiento Vehículos Oficiales</option>
                                            <option value="ESTACIONAMIENTO ESPECIAL VEHÍCULOS ELÉCTRICOS">
                                                Estacionamiento Especial Vehículos Eléctricos
                                            </option>
                                        </select>
                                    </div>

                                    <button style={styles.editPositionButton} onClick={enableLineEditing}>
                                        <MdAdjust size={20} /> Ajustar Posición de la Línea
                                    </button>
                                </div>

                                <div style={styles.modalActions}>
                                    <button style={styles.deleteButton} onClick={deleteSelectedLine} disabled={isLoading}>
                                        <MdDelete size={20} /> Eliminar
                                    </button>
                                    <button
                                        style={styles.cancelButton}
                                        onClick={() => {
                                            setEditModal(false)
                                            setSelectedLayer(null)
                                        }}
                                        disabled={isLoading}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        style={{ ...styles.confirmButton, ...(isLoading ? styles.buttonDisabled : {}) }}
                                        onClick={saveLineEdit}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <div style={styles.buttonSpinner}></div>Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <MdCheck size={20} /> Guardar Cambios
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}

                        {isEditingLine && (
                            <div style={styles.editingHintCompact}>
                                <MdEdit size={20} style={{ color: "#ff6b35" }} />
                                <span>Arrastra los puntos en el mapa para ajustar la línea</span>
                                <button
                                    style={styles.finishEditingButton}
                                    onClick={() => {
                                        if (editableLineRef?.editing) {
                                            editableLineRef.editing.disable()
                                        }
                                        setIsEditingLine(false)
                                        setEditableLineRef(null)
                                    }}
                                >
                                    <MdCheck size={18} /> Finalizar Edición
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {deleteConfirmModal && (
                <>
                    <div style={styles.modalOverlay} onClick={() => setDeleteConfirmModal(false)}></div>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                <MdWarning size={28} style={{ color: "#ef4444" }} />
                                Confirmar Eliminación
                            </h2>
                            <button style={styles.closeButton} onClick={() => setDeleteConfirmModal(false)}>
                                <MdClose size={24} />
                            </button>
                        </div>

                        <div style={styles.modalContent}>
                            <p style={styles.modalDescription}>
                                ¿Estás seguro de eliminar esta línea? Esta acción no se puede deshacer.
                            </p>
                        </div>

                        <div style={styles.modalActions}>
                            <button style={styles.cancelButton} onClick={() => setDeleteConfirmModal(false)}>
                                Cancelar
                            </button>
                            <button style={{ ...styles.deleteButton, ...styles.deleteConfirmButton }} onClick={confirmDeleteLine}>
                                <MdDelete size={20} /> Eliminar
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
        gap: "8px", // Changed from 12px to 8px to match the update
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
    label: {
        display: "block",
        fontSize: "0.9rem",
        fontWeight: "600",
        color: "#374151",
        marginBottom: "8px",
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
    editPositionButton: {
        width: "100%",
        padding: "12px 20px",
        fontSize: "1rem",
        fontWeight: "600",
        border: "2px solid #ff6b35",
        borderRadius: "12px",
        backgroundColor: "#fff5f2",
        color: "#ff6b35",
        cursor: "pointer",
        transition: "all 0.3s ease",
        marginTop: "12px",
        display: "flex", // Added for icon alignment
        alignItems: "center", // Added for icon alignment
        justifyContent: "center", // Added for icon alignment
        gap: "8px", // Added for icon alignment
    },
    modalMinimized: {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.2)",
        zIndex: 1600,
        width: "auto",
        maxWidth: "400px",
        border: "2px solid rgba(255, 107, 53, 0.2)",
        overflow: "hidden",
    },
    editingHintCompact: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "16px 20px",
        backgroundColor: "#fff5f2",
        borderTop: "1px solid rgba(255, 107, 53, 0.2)",
        color: "#ff6b35",
        fontSize: "0.9rem",
        fontWeight: "500",
    },
    finishEditingButton: {
        marginLeft: "auto",
        padding: "8px 16px",
        fontSize: "0.9rem",
        fontWeight: "600",
        border: "none",
        borderRadius: "8px",
        backgroundColor: "#ff6b35",
        color: "#ffffff",
        cursor: "pointer",
        transition: "all 0.3s ease",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        whiteSpace: "nowrap",
    },
    modalActions: {
        display: "flex",
        gap: "12px",
        padding: "24px",
        borderTop: "1px solid rgba(0, 0, 0, 0.1)",
        justifyContent: "flex-end",
    },
    deleteButton: {
        padding: "12px 24px",
        fontSize: "1rem",
        fontWeight: "600",
        border: "1px solid #ef4444",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        color: "#ef4444",
        cursor: "pointer",
        transition: "all 0.3s ease",
        marginRight: "auto",
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
    deleteConfirmButton: {
        backgroundColor: "#ef4444",
        color: "#ffffff",
        marginRight: "0",
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
