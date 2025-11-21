"use client"

import { useRef, useState, useEffect } from "react"
import { MapContainer, TileLayer, FeatureGroup, Polygon, Popup } from "react-leaflet"
import { EditControl } from "react-leaflet-draw"
import { MdDelete, MdEdit, MdCheckCircle, MdClose } from "react-icons/md"
import { TbRoad } from "react-icons/tb"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"
import axios from "axios"

const API_URL = process.env.REACT_APP_API_URL 

const MapaRestricciones = () => {
    const [mapLayers, setMapLayers] = useState([])
    const [center, setCenter] = useState({ lat: -17.39842096574417, lng: -66.15225245311389 })
    const [currentLayer, setCurrentLayer] = useState(null)
    const [modal, setModal] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [editingLayerId, setEditingLayerId] = useState(null)
    const [isEditingPoints, setIsEditingPoints] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState(null)
    const nextDbIdRef = useRef(1)
    const layerIdMapRef = useRef({})
    const editingLayerRef = useRef(null)
    const ZOOM_LEVEL = 15
    const mapRef = useRef()

    const common = {
        headers: {
            "ngrok-skip-browser-warning": "true",
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        timeout: 15000,
    }

    const getColorFromRestriction = () => {
        return "#ef4444"
    }

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const response = await axios.get(`${API_URL}/restricciones`, common)
                const { data, nextId } = response.data

                console.log("Frontend - Received data:", data.length, "restricciones")
                console.log("Frontend - Next ID from backend:", nextId)

                nextDbIdRef.current = nextId
                setMapLayers(data)
            } catch (error) {
                console.error("Error fetching restricciones:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleCreate = (e) => {
        const { layer } = e
        const dbId = nextDbIdRef.current

        console.log("Frontend - Creating new layer with ID:", dbId)

        nextDbIdRef.current = nextDbIdRef.current + 1
        layerIdMapRef.current[layer._leaflet_id] = dbId

        const newLayer = {
            id: dbId,
            type: "polygon",
            latlngs: layer.getLatLngs()[0].map((point) => ({ lat: point.lat, lng: point.lng })),
            restriction: "RESTRICCIÓN VEHICULAR",
        }
        setCurrentLayer(newLayer)
        setEditingLayerId(null)
        setModal(true)
    }

    const handlePolygonClick = (layer) => {
        const dbId = layerIdMapRef.current[layer._leaflet_id]
        const layerData = mapLayers.find((l) => l.id === dbId)

        if (layerData) {
            setCurrentLayer(layerData)
            setEditingLayerId(dbId)
            setIsEditingPoints(false)
            setModal(true)
        }
    }

    const enablePointEditing = () => {
        if (editingLayerId && mapRef.current) {
            const leafletId = Object.keys(layerIdMapRef.current).find(
                (key) => layerIdMapRef.current[key] === editingLayerId
            )
            if (leafletId) {
                const layer = mapRef.current._layers[leafletId]
                if (layer && layer.editing) {
                    editingLayerRef.current = layer

                    if (layer.on) {
                        layer.on("editstart", () => {
                            console.log("Editing started for layer:", editingLayerId)
                        })
                        layer.on("editmove", () => {
                            console.log("Layer points changed during edit")
                        })
                        layer.on("editstop", () => {
                            console.log("Editing stopped for layer:", editingLayerId)
                        })
                    }

                    layer.editing.enable()
                    setIsEditingPoints(true)
                    console.log("Point editing enabled for layer:", editingLayerId)
                }
            }
        }
    }

    const saveLineEdit = async () => {
        if (!editingLayerId || !editingLayerRef.current) return

        const layer = editingLayerRef.current

        let latlngs = []
        try {
            if (layer.getLatLngs && typeof layer.getLatLngs === 'function') {
                const coords = layer.getLatLngs()
                if (Array.isArray(coords) && coords.length > 0) {
                    latlngs = Array.isArray(coords[0]) ? coords[0] : coords
                }
            }
        } catch (err) {
            console.error("Error extracting coordinates:", err)
        }

        if (latlngs.length === 0) {
            alert("Error: No se pudieron obtener las coordenadas del polígono")
            return
        }

        const updatedLayer = {
            id: editingLayerId,
            latlngs: latlngs.map((point) => ({
                lat: point.lat || point[0],
                lng: point.lng || point[1]
            })),
            type: "polygon",
            restriction: currentLayer?.restriction || "RESTRICCIÓN VEHICULAR",
        }

        console.log("Frontend - Saving edited layer with", updatedLayer.latlngs.length, "points")

        try {
            setIsLoading(true)
            await axios.put(`${API_URL}/restricciones/${editingLayerId}`, updatedLayer, common)

            setMapLayers((prev) => prev.map((l) => (l.id === editingLayerId ? updatedLayer : l)))
            setCurrentLayer(updatedLayer)

            if (layer.editing) {
                layer.editing.disable()
            }
            setIsEditingPoints(false)
            editingLayerRef.current = null

            console.log("Frontend - Layer saved successfully")
        } catch (error) {
            console.error("Error updating restricción:", error)
            alert("Error al actualizar la restricción")
        } finally {
            setIsLoading(false)
        }
    }

    const deleteLayer = async (id) => {
        console.log("Frontend - Deleting layer with ID:", id)

        try {
            setIsLoading(true)
            await axios.delete(`${API_URL}/restricciones/${id}`, common)
            setMapLayers((prev) => prev.filter((l) => l.id !== id))

            const leafletId = Object.keys(layerIdMapRef.current).find(
                (key) => layerIdMapRef.current[key] === id
            )
            if (leafletId) {
                delete layerIdMapRef.current[leafletId]
            }

            setModal(false)
            setCurrentLayer(null)
            setEditingLayerId(null)
            setDeleteConfirmId(null)
            console.log("Frontend - Layer deleted successfully")
        } catch (error) {
            console.error("Error deleting restricción:", error)
            alert("Error al eliminar la restricción")
        } finally {
            setIsLoading(false)
        }
    }

    const confirmModal = async () => {
        setIsLoading(true)
        try {
            console.log("Frontend - Saving layer:", currentLayer)

            await axios.post(`${API_URL}/restricciones`, currentLayer, common)
            setMapLayers((prev) => [...prev, currentLayer])
            setModal(false)
            setCurrentLayer(null)

            console.log("Frontend - Layer saved successfully")
        } catch (error) {
            console.error("Error saving restricción:", error)
            alert("Error al guardar la restricción")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <div style={styles.mapWrapper}>
                {isLoading && (
                    <div style={styles.loadingOverlay}>
                        <div style={styles.spinner}></div>
                        <span style={styles.loadingText}>Cargando...</span>
                    </div>
                )}

                <MapContainer center={center} zoom={ZOOM_LEVEL} ref={mapRef} style={styles.map} className="custom-map">
                    <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                    <FeatureGroup>
                        <EditControl
                            position="topright"
                            onCreated={handleCreate}
                            draw={{
                                rectangle: false,
                                polyline: false,
                                circle: false,
                                circlemarker: false,
                                marker: false,
                                edit: false,
                                polygon: {
                                    shapeOptions: {
                                        color: "#ef4444",
                                        weight: 3,
                                        opacity: 0.8,
                                        fillOpacity: 0.3,
                                    },
                                },
                            }}
                        />
                        {mapLayers.map((layer) => (
                            <Polygon
                                key={layer.id}
                                positions={layer.latlngs}
                                color={getColorFromRestriction()}
                                weight={3}
                                opacity={0.8}
                                fillColor={getColorFromRestriction()}
                                fillOpacity={0.3}
                                eventHandlers={{
                                    add: (e) => {
                                        layerIdMapRef.current[e.target._leaflet_id] = layer.id
                                        console.log("Frontend - Mapped Leaflet ID:", e.target._leaflet_id, "to DB ID:", layer.id)
                                    },
                                    click: (e) => {
                                        handlePolygonClick(e.target)
                                    },
                                }}
                            >
                                <Popup className="custom-popup">
                                    <div style={styles.popupContent}>
                                        <div style={styles.popupHeader}>
                                            <TbRoad size={20} color="#ef4444" />
                                        </div>
                                        <div style={styles.popupText}>
                                            <strong>{layer.restriction || "Sin restricción"}</strong>
                                        </div>
                                    </div>
                                </Popup>
                            </Polygon>
                        ))}
                    </FeatureGroup>
                </MapContainer>

                {/* Leyenda flotante */}
                <div style={styles.legend}>
                    <h3 style={styles.legendTitle}>
                        <TbRoad size={20} />
                        Restricciones Vehiculares
                    </h3>
                    <div style={styles.legendItems}>
                        <div style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, backgroundColor: "#ef4444" }}></div>
                            <span>Restricción Vehicular</span>
                        </div>
                    </div>
                </div>
            </div>

            {modal && (
                <>
                    {!isEditingPoints && <div style={styles.modalOverlay} onClick={() => setModal(false)}></div>}
                    <div style={{ ...styles.modal, ...(isEditingPoints ? styles.modalMinimized : {}) }}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                <TbRoad size={24} />
                                Restricción Vehicular
                            </h2>
                            {!isEditingPoints && (
                                <button style={styles.closeButton} onClick={() => setModal(false)}>
                                    <MdClose size={20} />
                                </button>
                            )}
                        </div>

                        {isEditingPoints ? (
                            <div style={styles.minimizedContent}>
                                <div style={styles.minimizedText}>Arrastra los puntos en el mapa para ajustar la línea</div>
                                <button
                                    style={styles.finishButton}
                                    onClick={saveLineEdit}
                                    disabled={isLoading}
                                >
                                    <MdCheckCircle size={18} />
                                    Finalizar Edición
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={styles.modalContent}>
                                    <p style={styles.modalDescription}>
                                        {editingLayerId ? "Edita los datos de la restricción vehicular" : "Se creará una zona de restricción vehicular en el área seleccionada"}
                                    </p>

                                    <div style={styles.previewCard}>
                                        <div style={styles.previewHeader}>
                                            <TbRoad size={24} color="#ef4444" />
                                        </div>
                                        <div style={styles.previewText}>RESTRICCIÓN VEHICULAR</div>
                                        <div
                                            style={{
                                                ...styles.previewColor,
                                                backgroundColor: getColorFromRestriction(),
                                            }}
                                        ></div>
                                    </div>

                                    {editingLayerId && (
                                        <div style={styles.editButtonsGroup}>
                                            <button
                                                style={styles.editPointsButton}
                                                onClick={enablePointEditing}
                                                disabled={isLoading}
                                            >
                                                <MdEdit size={18} />
                                                Ajustar Posición de la Línea
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div style={styles.modalActions}>
                                    <button style={styles.cancelButton} onClick={() => setModal(false)} disabled={isLoading}>
                                        Cancelar
                                    </button>
                                    {editingLayerId ? (
                                        <button
                                            style={{
                                                ...styles.deleteButton,
                                                ...(isLoading ? styles.buttonDisabled : {}),
                                            }}
                                            onClick={() => setDeleteConfirmId(editingLayerId)}
                                            disabled={isLoading}
                                        >
                                            <MdDelete size={18} />
                                            Eliminar
                                        </button>
                                    ) : (
                                        <button
                                            style={{
                                                ...styles.confirmButton,
                                                ...(isLoading ? styles.buttonDisabled : {}),
                                            }}
                                            onClick={confirmModal}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <div style={styles.buttonSpinner}></div>
                                                    Guardando...
                                                </>
                                            ) : (
                                                <>
                                                    <MdCheckCircle size={18} />
                                                    Confirmar
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {deleteConfirmId && (
                <>
                    <div style={styles.modalOverlay} onClick={() => setDeleteConfirmId(null)}></div>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Confirmar Eliminación</h2>
                            <button style={styles.closeButton} onClick={() => setDeleteConfirmId(null)}>
                                <MdClose size={20} />
                            </button>
                        </div>
                        <div style={styles.modalContent}>
                            <p style={styles.modalDescription}>¿Estás seguro de que deseas eliminar esta restricción vehicular? Esta acción no se puede deshacer.</p>
                        </div>
                        <div style={styles.modalActions}>
                            <button style={styles.cancelButton} onClick={() => setDeleteConfirmId(null)} disabled={isLoading}>
                                Cancelar
                            </button>
                            <button
                                style={{
                                    ...styles.deleteButton,
                                    ...(isLoading ? styles.buttonDisabled : {}),
                                }}
                                onClick={() => {
                                    console.log("Deleting restricción with ID:", deleteConfirmId)
                                    deleteLayer(deleteConfirmId)
                                }}
                                disabled={isLoading}
                            >
                                <MdDelete size={18} />
                                Eliminar
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    )
}

export default MapaRestricciones

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
        minWidth: "280px",
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
        fontSize: "0.85rem",
        color: "#000000",
        fontWeight: "500",
    },
    legendColor: {
        width: "16px",
        height: "16px",
        borderRadius: "4px",
        border: "2px solid rgba(0, 0, 0, 0.1)",
    },
    popupContent: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "8px",
        minWidth: "200px",
    },
    popupHeader: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },
    popupText: {
        fontSize: "0.95rem",
        color: "#000000",
        lineHeight: "1.4",
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
        maxWidth: "380px",
        border: "2px solid rgba(255, 107, 53, 0.2)",
        overflow: "hidden",
    },
    modalMinimized: {
        top: "auto",
        left: "auto",
        bottom: "20px",
        right: "20px",
        transform: "none",
        maxWidth: "320px",
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
        color: "#6b7280",
        marginBottom: "20px",
        lineHeight: "1.5",
        margin: "0 0 20px 0",
    },
    previewCard: {
        background: "linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 107, 53, 0.1) 100%)",
        border: "2px solid rgba(255, 107, 53, 0.2)",
        borderRadius: "12px",
        padding: "16px",
        position: "relative",
        overflow: "hidden",
    },
    previewHeader: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "8px",
    },
    previewText: {
        fontSize: "0.95rem",
        color: "#000000",
        fontWeight: "600",
    },
    previewColor: {
        position: "absolute",
        top: 0,
        right: 0,
        width: "4px",
        height: "100%",
        borderRadius: "0 12px 12px 0",
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
        border: "2px solid #e5e7eb",
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
    deleteButton: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 24px",
        fontSize: "1rem",
        fontWeight: "600",
        border: "none",
        borderRadius: "12px",
        backgroundColor: "#ef4444",
        color: "#ffffff",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 4px 15px rgba(239, 68, 68, 0.3)",
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
    minimizedContent: {
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        alignItems: "center",
    },
    minimizedText: {
        fontSize: "0.9rem",
        color: "#ff6b35",
        fontWeight: "600",
        textAlign: "center",
    },
    finishButton: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 20px",
        fontSize: "0.95rem",
        fontWeight: "600",
        border: "none",
        borderRadius: "12px",
        backgroundColor: "#ff6b35",
        color: "#ffffff",
        cursor: "pointer",
        transition: "all 0.3s ease",
    },
    editButtonsGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginTop: "16px",
    },
    editPointsButton: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "12px 16px",
        fontSize: "0.95rem",
        fontWeight: "600",
        border: "2px solid #ff6b35",
        borderRadius: "12px",
        backgroundColor: "#fff",
        color: "#ff6b35",
        cursor: "pointer",
        transition: "all 0.3s ease",
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
        
        .delete-button:hover:not(:disabled) {
            background-color: #e55a2b;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
        }
    `
    document.head.appendChild(styleSheet)
}
