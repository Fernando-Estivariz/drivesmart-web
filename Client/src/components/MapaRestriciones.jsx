"use client"

import { useRef, useState, useEffect } from "react"
import { MapContainer, TileLayer, FeatureGroup, Polygon, Popup } from "react-leaflet"
import { EditControl } from "react-leaflet-draw"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"
import axios from "axios"

const API_URL = process.env.REACT_APP_API_URL || "https://41e248bfedcf.ngrok-free.app"

const MapaRestricciones = () => {
    const [mapLayers, setMapLayers] = useState([])
    const [center, setCenter] = useState({ lat: -17.39842096574417, lng: -66.15225245311389 })
    const [currentLayer, setCurrentLayer] = useState(null)
    const [modal, setModal] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const nextDbIdRef = useRef(1)
    const layerIdMapRef = useRef({})
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
        return "#ef4444" // Rojo para todas las restricciones vehiculares
    }

    const getIconFromRestriction = () => {
        return "🚦" // Icono de semáforo para restricción vehicular
    }

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const response = await axios.get(`${API_URL}/restricciones`, common)
                const { data, nextId } = response.data

                console.log("[v0] Frontend - Received data:", data.length, "restricciones")
                console.log("[v0] Frontend - Next ID from backend:", nextId)

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

        console.log("[v0] Frontend - Creating new layer with ID:", dbId)

        nextDbIdRef.current = nextDbIdRef.current + 1

        layerIdMapRef.current[layer._leaflet_id] = dbId

        const newLayer = {
            id: dbId,
            type: "polygon",
            latlngs: layer.getLatLngs()[0].map((point) => ({ lat: point.lat, lng: point.lng })),
            restriction: "RESTRICCIÓN VEHICULAR",
        }
        setCurrentLayer(newLayer)
        setModal(true)
    }

    const handleEdit = (e) => {
        const {
            layers: { _layers },
        } = e

        Object.values(_layers).forEach(async (layer) => {
            const dbId = layerIdMapRef.current[layer._leaflet_id]
            const layerData = mapLayers.find((l) => l.id === dbId)

            console.log("[v0] Frontend - Editing layer with Leaflet ID:", layer._leaflet_id, "DB ID:", dbId)

            if (!layerData) {
                console.error("[v0] Frontend - Layer not found for DB ID:", dbId)
                return
            }

            const updatedLayer = {
                id: layerData.id,
                latlngs: layer.getLatLngs()[0].map((point) => ({ lat: point.lat, lng: point.lng })),
                type: "polygon",
                restriction: layerData.restriction,
            }

            console.log("[v0] Frontend - Updating layer:", updatedLayer)

            try {
                await axios.put(`${API_URL}/restricciones/${layerData.id}`, updatedLayer, common)
                setMapLayers((prev) => prev.map((l) => (l.id === updatedLayer.id ? updatedLayer : l)))
                console.log("[v0] Frontend - Layer updated successfully")
            } catch (error) {
                console.error("Error updating restricción:", error)
                alert("Error al actualizar la restricción")
            }
        })
    }

    const handleDelete = (e) => {
        const {
            layers: { _layers },
        } = e

        Object.values(_layers).forEach(async (layer) => {
            const dbId = layerIdMapRef.current[layer._leaflet_id]
            const layerData = mapLayers.find((l) => l.id === dbId)

            console.log("[v0] Frontend - Deleting layer with Leaflet ID:", layer._leaflet_id, "DB ID:", dbId)

            if (!layerData) {
                console.error("[v0] Frontend - Layer not found for DB ID:", dbId)
                return
            }

            console.log("[v0] Frontend - Deleting layer:", layerData)

            try {
                await axios.delete(`${API_URL}/restricciones/${layerData.id}`, common)
                setMapLayers((prev) => prev.filter((l) => l.id !== layerData.id))
                delete layerIdMapRef.current[layer._leaflet_id]
                console.log("[v0] Frontend - Layer deleted successfully")
            } catch (error) {
                console.error("Error deleting restricción:", error)
                alert("Error al eliminar la restricción")
            }
        })
    }

    const confirmModal = async () => {
        setIsLoading(true)
        try {
            console.log("[v0] Frontend - Saving layer:", currentLayer)

            await axios.post(`${API_URL}/restricciones`, currentLayer, common)
            setMapLayers((prev) => [...prev, currentLayer])
            setModal(false)
            setCurrentLayer(null)

            console.log("[v0] Frontend - Layer saved successfully")
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
                            onEdited={handleEdit}
                            onDeleted={handleDelete}
                            draw={{
                                rectangle: false,
                                polyline: false,
                                circle: false,
                                circlemarker: false,
                                marker: false,
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
                                        console.log("[v0] Frontend - Mapped Leaflet ID:", e.target._leaflet_id, "to DB ID:", layer.id)
                                    },
                                }}
                            >
                                <Popup className="custom-popup">
                                    <div style={styles.popupContent}>
                                        <div style={styles.popupHeader}>
                                            <div style={styles.popupIcon}>{getIconFromRestriction()}</div>
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
                        <span style={styles.legendIcon}>🚦</span>
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
                    <div style={styles.modalOverlay} onClick={() => setModal(false)}></div>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                <span style={styles.modalIcon}>🚦</span>
                                Restricción Vehicular
                            </h2>
                            <button style={styles.closeButton} onClick={() => setModal(false)}>
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalContent}>
                            <p style={styles.modalDescription}>
                                Se creará una zona de restricción vehicular en el área seleccionada.
                            </p>

                            <div style={styles.previewCard}>
                                <div style={styles.previewHeader}>
                                    <div style={styles.previewIcon}>{getIconFromRestriction()}</div>
                                </div>
                                <div style={styles.previewText}>RESTRICCIÓN VEHICULAR</div>
                                <div
                                    style={{
                                        ...styles.previewColor,
                                        backgroundColor: getColorFromRestriction(),
                                    }}
                                ></div>
                            </div>
                        </div>

                        <div style={styles.modalActions}>
                            <button style={styles.cancelButton} onClick={() => setModal(false)} disabled={isLoading}>
                                Cancelar
                            </button>
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
                                        <span>✓</span>
                                        Confirmar
                                    </>
                                )}
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
    legendIcon: {
        fontSize: "1.2rem",
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
    popupIcon: {
        fontSize: "1.5rem",
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
        maxWidth: "550px",
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
    previewIcon: {
        fontSize: "1.5rem",
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
    `
    document.head.appendChild(styleSheet)
}
