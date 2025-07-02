"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Circle, CircleMarker } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import axios from "axios"
import { Sidebar } from "../components/Sidebar"

const Estadisticas = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [heatDataProhibidos, setHeatDataProhibidos] = useState([])
    const [heatDataTarifados, setHeatDataTarifados] = useState([])
    const [countProhibidos, setCountProhibidos] = useState(0)
    const [countTarifados, setCountTarifados] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [totalZones, setTotalZones] = useState(0)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const response = await axios.get("http://localhost:4000/mapeado")
                const data = response.data

                console.log("Datos obtenidos del backend:", data)

                // Filtrar los datos por restricciones
                const prohibidos = data.filter((item) => item.restriction === "Prohibido estacionar")
                const tarifados = data.filter((item) => item.restriction === "Estacionamiento Tarifado")

                console.log("Datos Prohibidos Estacionar:", prohibidos)
                console.log("Datos Estacionamiento Tarifado:", tarifados)

                // Función mejorada para procesar coordenadas
                const processHeatmapData = (items) => {
                    const points = []

                    items.forEach((item) => {
                        if (item.type === "polygon") {
                            // Para polígonos, tomar múltiples puntos del perímetro
                            item.latlngs.forEach((coord, index) => {
                                if (index % 2 === 0) {
                                    // Tomar cada segundo punto para no saturar
                                    points.push({
                                        lat: coord.lat || coord[0],
                                        lng: coord.lng || coord[1],
                                        intensity: Math.random() * 0.8 + 0.4, // Intensidad variable
                                    })
                                }
                            })

                            // Agregar punto central del polígono
                            const centerLat =
                                item.latlngs.reduce((sum, coord) => sum + (coord.lat || coord[0]), 0) / item.latlngs.length
                            const centerLng =
                                item.latlngs.reduce((sum, coord) => sum + (coord.lng || coord[1]), 0) / item.latlngs.length
                            points.push({
                                lat: centerLat,
                                lng: centerLng,
                                intensity: 1.0, // Máxima intensidad en el centro
                            })
                        } else if (item.type === "polyline") {
                            // Para líneas, tomar puntos a lo largo de la línea
                            item.latlngs.forEach((coord) => {
                                points.push({
                                    lat: coord.lat || coord[0],
                                    lng: coord.lng || coord[1],
                                    intensity: Math.random() * 0.6 + 0.5,
                                })
                            })
                        } else if (item.type === "marker") {
                            points.push({
                                lat: item.latlngs[1] || item.latlngs.lat,
                                lng: item.latlngs[0] || item.latlngs.lng,
                                intensity: 0.8,
                            })
                        }
                    })

                    return points
                }

                setHeatDataProhibidos(processHeatmapData(prohibidos))
                setHeatDataTarifados(processHeatmapData(tarifados))
                setCountProhibidos(prohibidos.length)
                setCountTarifados(tarifados.length)
                setTotalZones(data.length)
            } catch (error) {
                console.error("Error fetching data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [])

    // Componente de mapa de calor mejorado usando círculos graduales
    const HeatmapLayer = ({ data, color, name }) => {
        // Crear clusters de puntos cercanos para mejor visualización
        const createClusters = (points, radius = 0.001) => {
            const clusters = []
            const processed = new Set()

            points.forEach((point, index) => {
                if (processed.has(index)) return

                const cluster = {
                    lat: point.lat,
                    lng: point.lng,
                    intensity: point.intensity,
                    count: 1,
                }

                // Buscar puntos cercanos
                points.forEach((otherPoint, otherIndex) => {
                    if (index !== otherIndex && !processed.has(otherIndex)) {
                        const distance = Math.sqrt(
                            Math.pow(point.lat - otherPoint.lat, 2) + Math.pow(point.lng - otherPoint.lng, 2),
                        )

                        if (distance < radius) {
                            cluster.intensity = Math.max(cluster.intensity, otherPoint.intensity)
                            cluster.count++
                            processed.add(otherIndex)
                        }
                    }
                })

                clusters.push(cluster)
                processed.add(index)
            })

            return clusters
        }

        const clusters = createClusters(data)

        return (
            <>
                {clusters.map((cluster, index) => {
                    const baseRadius = 50
                    const radius = baseRadius * (0.5 + cluster.intensity * 0.8) * Math.sqrt(cluster.count)
                    const opacity = Math.min(cluster.intensity * 0.7, 0.8)

                    return (
                        <div key={`cluster-${index}`}>
                            {/* Círculo exterior (efecto de difuminado) */}
                            <Circle
                                center={[cluster.lat, cluster.lng]}
                                radius={radius * 1.5}
                                pathOptions={{
                                    fillColor: color,
                                    fillOpacity: opacity * 0.3,
                                    color: color,
                                    weight: 0,
                                }}
                            />
                            {/* Círculo medio */}
                            <Circle
                                center={[cluster.lat, cluster.lng]}
                                radius={radius}
                                pathOptions={{
                                    fillColor: color,
                                    fillOpacity: opacity * 0.6,
                                    color: color,
                                    weight: 1,
                                    opacity: 0.4,
                                }}
                            />
                            {/* Círculo interior (núcleo) */}
                            <CircleMarker
                                center={[cluster.lat, cluster.lng]}
                                radius={Math.min(8 + cluster.count * 2, 15)}
                                pathOptions={{
                                    fillColor: color,
                                    fillOpacity: opacity,
                                    color: "#ffffff",
                                    weight: 2,
                                    opacity: 0.8,
                                }}
                            >
                                {/* Popup con información */}
                                <div style={styles.heatmapPopup}>
                                    <strong>{name}</strong>
                                    <br />
                                    Intensidad: {Math.round(cluster.intensity * 100)}%
                                    <br />
                                    Puntos: {cluster.count}
                                </div>
                            </CircleMarker>
                        </div>
                    )
                })}
            </>
        )
    }

    const getPercentage = (count, total) => {
        return total > 0 ? Math.round((count / total) * 100) : 0
    }

    return (
        <div style={styles.container}>
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            <div
                className={sidebarOpen ? "content-expanded" : "content-collapsed"}
                style={{
                    ...styles.mainContent,
                    transition: "margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
            >
                {/* Background Effects */}
                <div style={styles.backgroundEffects}>
                    <div style={styles.gradientOrb1}></div>
                    <div style={styles.gradientOrb2}></div>
                </div>

                {/* Header Section */}
                <div style={styles.header}>
                    <h1 style={styles.title}>
                        <span style={styles.titleIcon}>📊</span>
                        Reportes y <span style={styles.titleAccent}>Estadísticas</span>
                    </h1>
                    <p style={styles.subtitle}>Análisis de datos de estacionamientos y restricciones vehiculares</p>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div style={styles.loadingContainer}>
                        <div style={styles.spinner}></div>
                        <span style={styles.loadingText}>Cargando datos estadísticos...</span>
                    </div>
                )}

                {/* Stats Section */}
                {!isLoading && (
                    <>
                        <div style={styles.statsSection}>
                            <div style={styles.statsGrid}>
                                <div style={styles.statCard}>
                                    <div style={styles.statIcon}>🚫</div>
                                    <div style={styles.statContent}>
                                        <h3 style={styles.statTitle}>Prohibido Estacionar</h3>
                                        <div style={styles.statValue}>{countProhibidos}</div>
                                        <div style={styles.statPercentage}>{getPercentage(countProhibidos, totalZones)}% del total</div>
                                        <div style={styles.statDetail}>{heatDataProhibidos.length} puntos de calor</div>
                                    </div>
                                    <div style={styles.statIndicator}>
                                        <div
                                            style={{
                                                ...styles.statBar,
                                                width: `${getPercentage(countProhibidos, totalZones)}%`,
                                                backgroundColor: "#ef4444",
                                            }}
                                        ></div>
                                    </div>
                                </div>

                                <div style={styles.statCard}>
                                    <div style={styles.statIcon}>💰</div>
                                    <div style={styles.statContent}>
                                        <h3 style={styles.statTitle}>Estacionamiento Tarifado</h3>
                                        <div style={styles.statValue}>{countTarifados}</div>
                                        <div style={styles.statPercentage}>{getPercentage(countTarifados, totalZones)}% del total</div>
                                        <div style={styles.statDetail}>{heatDataTarifados.length} puntos de calor</div>
                                    </div>
                                    <div style={styles.statIndicator}>
                                        <div
                                            style={{
                                                ...styles.statBar,
                                                width: `${getPercentage(countTarifados, totalZones)}%`,
                                                backgroundColor: "#3b82f6",
                                            }}
                                        ></div>
                                    </div>
                                </div>

                                <div style={styles.statCard}>
                                    <div style={styles.statIcon}>📍</div>
                                    <div style={styles.statContent}>
                                        <h3 style={styles.statTitle}>Total de Zonas</h3>
                                        <div style={styles.statValue}>{totalZones}</div>
                                        <div style={styles.statPercentage}>Zonas mapeadas</div>
                                        <div style={styles.statDetail}>
                                            {heatDataProhibidos.length + heatDataTarifados.length} puntos totales
                                        </div>
                                    </div>
                                    <div style={styles.statIndicator}>
                                        <div
                                            style={{
                                                ...styles.statBar,
                                                width: "100%",
                                                backgroundColor: "#ff6b35",
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Heat Maps Section */}
                        <div style={styles.mapsSection}>
                            {/* Mapa combinado */}
                            <div style={styles.mapContainer}>
                                <div style={styles.mapHeader}>
                                    <h2 style={styles.mapTitle}>
                                        <span style={styles.mapIcon}>🔥</span>
                                        Mapa de Calor Combinado
                                    </h2>
                                    <div style={styles.mapStats}>
                                        <span style={styles.mapCount}>{heatDataProhibidos.length + heatDataTarifados.length} puntos</span>
                                    </div>
                                </div>
                                <div style={styles.mapWrapper}>
                                    <MapContainer center={[-17.3749, -66.1585]} zoom={15} style={styles.map} className="custom-heat-map">
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution="© OpenStreetMap contributors"
                                        />
                                        <HeatmapLayer data={heatDataProhibidos} color="#ef4444" name="Prohibido Estacionar" />
                                        <HeatmapLayer data={heatDataTarifados} color="#3b82f6" name="Estacionamiento Tarifado" />
                                    </MapContainer>
                                    <div style={styles.mapLegend}>
                                        <div style={styles.legendTitle}>Intensidad de Calor</div>
                                        <div style={styles.legendItem}>
                                            <div style={{ ...styles.legendDot, backgroundColor: "#ef4444" }}></div>
                                            <span>🚫 Prohibido</span>
                                        </div>
                                        <div style={styles.legendItem}>
                                            <div style={{ ...styles.legendDot, backgroundColor: "#3b82f6" }}></div>
                                            <span>💰 Tarifado</span>
                                        </div>
                                        <div style={styles.heatScale}>
                                            <span style={styles.scaleLabel}>Baja</span>
                                            <div style={styles.scaleGradient}></div>
                                            <span style={styles.scaleLabel}>Alta</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mapas individuales */}
                            <div style={styles.mapContainer}>
                                <div style={styles.mapHeader}>
                                    <h2 style={styles.mapTitle}>
                                        <span style={styles.mapIcon}>🚫</span>
                                        Zonas Prohibidas - Análisis Detallado
                                    </h2>
                                    <div style={styles.mapStats}>
                                        <span style={styles.mapCount}>{heatDataProhibidos.length} puntos</span>
                                    </div>
                                </div>
                                <div style={styles.mapWrapper}>
                                    <MapContainer center={[-17.3749, -66.1585]} zoom={16} style={styles.map} className="custom-heat-map">
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution="© OpenStreetMap contributors"
                                        />
                                        <HeatmapLayer data={heatDataProhibidos} color="#ef4444" name="Prohibido Estacionar" />
                                    </MapContainer>
                                    <div style={styles.mapLegend}>
                                        <div style={styles.legendItem}>
                                            <div style={{ ...styles.legendDot, backgroundColor: "#ef4444" }}></div>
                                            <span>Zonas prohibidas</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.mapContainer}>
                                <div style={styles.mapHeader}>
                                    <h2 style={styles.mapTitle}>
                                        <span style={styles.mapIcon}>💰</span>
                                        Zonas Tarifadas - Análisis Detallado
                                    </h2>
                                    <div style={styles.mapStats}>
                                        <span style={styles.mapCount}>{heatDataTarifados.length} puntos</span>
                                    </div>
                                </div>
                                <div style={styles.mapWrapper}>
                                    <MapContainer center={[-17.3749, -66.1585]} zoom={16} style={styles.map} className="custom-heat-map">
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution="© OpenStreetMap contributors"
                                        />
                                        <HeatmapLayer data={heatDataTarifados} color="#3b82f6" name="Estacionamiento Tarifado" />
                                    </MapContainer>
                                    <div style={styles.mapLegend}>
                                        <div style={styles.legendItem}>
                                            <div style={{ ...styles.legendDot, backgroundColor: "#3b82f6" }}></div>
                                            <span>Zonas tarifadas</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default Estadisticas

const styles = {
    container: {
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#000000",
        position: "relative",
    },
    mainContent: {
        flex: 1,
        minHeight: "100vh",
        position: "relative",
        overflow: "auto",
    },
    backgroundEffects: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
    },
    gradientOrb1: {
        position: "absolute",
        top: "15%",
        right: "10%",
        width: "300px",
        height: "300px",
        background: "radial-gradient(circle, rgba(255, 107, 53, 0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        animation: "float 8s ease-in-out infinite",
    },
    gradientOrb2: {
        position: "absolute",
        bottom: "20%",
        left: "15%",
        width: "200px",
        height: "200px",
        background: "radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%)",
        borderRadius: "50%",
        animation: "float 6s ease-in-out infinite reverse",
    },
    header: {
        padding: "40px 40px 20px 40px",
        textAlign: "center",
        position: "relative",
        zIndex: 1,
    },
    title: {
        fontSize: "3rem",
        fontWeight: "800",
        color: "#ffffff",
        margin: "0 0 16px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
    },
    titleIcon: {
        fontSize: "2.5rem",
    },
    titleAccent: {
        color: "#ff6b35",
    },
    subtitle: {
        fontSize: "1.2rem",
        color: "rgba(255, 255, 255, 0.7)",
        margin: 0,
        maxWidth: "600px",
        marginLeft: "auto",
        marginRight: "auto",
    },
    loadingContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 40px",
        position: "relative",
        zIndex: 1,
    },
    spinner: {
        width: "50px",
        height: "50px",
        border: "4px solid rgba(255, 107, 53, 0.3)",
        borderTop: "4px solid #ff6b35",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: "20px",
    },
    loadingText: {
        color: "#ffffff",
        fontSize: "1.2rem",
        fontWeight: "600",
    },
    statsSection: {
        padding: "20px 40px 40px 40px",
        position: "relative",
        zIndex: 1,
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
    },
    statCard: {
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        borderRadius: "20px",
        padding: "32px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
        border: "1px solid rgba(255, 107, 53, 0.2)",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
    },
    statIcon: {
        fontSize: "3rem",
        marginBottom: "16px",
        display: "block",
    },
    statContent: {
        marginBottom: "20px",
    },
    statTitle: {
        fontSize: "1.1rem",
        fontWeight: "600",
        color: "#000000",
        margin: "0 0 12px 0",
    },
    statValue: {
        fontSize: "3rem",
        fontWeight: "800",
        color: "#ff6b35",
        margin: "0 0 8px 0",
        lineHeight: "1",
    },
    statPercentage: {
        fontSize: "0.9rem",
        color: "rgba(0, 0, 0, 0.6)",
        fontWeight: "500",
        marginBottom: "4px",
    },
    statDetail: {
        fontSize: "0.8rem",
        color: "rgba(0, 0, 0, 0.5)",
        fontStyle: "italic",
    },
    statIndicator: {
        height: "4px",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        borderRadius: "2px",
        overflow: "hidden",
    },
    statBar: {
        height: "100%",
        borderRadius: "2px",
        transition: "width 1s ease-out",
    },
    mapsSection: {
        padding: "0 40px 40px 40px",
        position: "relative",
        zIndex: 1,
    },
    mapContainer: {
        marginBottom: "60px",
    },
    mapHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: "16px",
    },
    mapTitle: {
        fontSize: "2rem",
        fontWeight: "700",
        color: "#ffffff",
        margin: 0,
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },
    mapIcon: {
        fontSize: "1.8rem",
    },
    mapStats: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
    },
    mapCount: {
        background: "rgba(255, 107, 53, 0.1)",
        border: "1px solid rgba(255, 107, 53, 0.3)",
        borderRadius: "20px",
        padding: "8px 16px",
        color: "#ff6b35",
        fontSize: "0.9rem",
        fontWeight: "600",
    },
    mapWrapper: {
        position: "relative",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
        border: "2px solid rgba(255, 107, 53, 0.2)",
    },
    map: {
        height: "500px",
        width: "100%",
    },
    mapLegend: {
        position: "absolute",
        bottom: "20px",
        left: "20px",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
        border: "1px solid rgba(255, 107, 53, 0.2)",
        minWidth: "150px",
    },
    legendTitle: {
        fontSize: "0.9rem",
        fontWeight: "700",
        color: "#000000",
        marginBottom: "12px",
    },
    legendItem: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.85rem",
        color: "#000000",
        fontWeight: "500",
        marginBottom: "8px",
    },
    legendDot: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        border: "2px solid rgba(0, 0, 0, 0.1)",
    },
    heatScale: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "12px",
        paddingTop: "12px",
        borderTop: "1px solid rgba(0, 0, 0, 0.1)",
    },
    scaleLabel: {
        fontSize: "0.75rem",
        color: "rgba(0, 0, 0, 0.6)",
    },
    scaleGradient: {
        flex: 1,
        height: "8px",
        borderRadius: "4px",
        background: "linear-gradient(90deg, rgba(255, 107, 53, 0.3) 0%, rgba(255, 107, 53, 1) 100%)",
    },
    heatmapPopup: {
        fontSize: "0.85rem",
        lineHeight: "1.4",
    },
}

// Agregar animaciones CSS
if (typeof document !== "undefined") {
    const styleSheet = document.createElement("style")
    styleSheet.textContent = `
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .content-expanded {
          margin-left: 280px;
        }

        .content-collapsed {
          margin-left: 80px;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
        }
        
        .custom-heat-map .leaflet-control-container .leaflet-top.leaflet-right {
            top: 20px;
            right: 20px;
        }
        
        .custom-heat-map .leaflet-control-zoom {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            border: 1px solid rgba(255, 107, 53, 0.2);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .custom-heat-map .leaflet-control-zoom a {
            border-radius: 8px;
            margin: 4px;
            transition: all 0.3s ease;
        }
        
        .custom-heat-map .leaflet-control-zoom a:hover {
            background-color: rgba(255, 107, 53, 0.1);
            border-color: #ff6b35;
        }
        
        @media (max-width: 768px) {
            .content-expanded,
            .content-collapsed {
              margin-left: 0;
            }
            
            .stats-grid {
              grid-template-columns: 1fr;
            }
            
            .map-header {
              flex-direction: column;
              align-items: stretch;
              text-align: center;
            }
            
            .title {
              font-size: 2rem !important;
              flex-direction: column;
              gap: 8px;
            }
            
            .map-title {
              font-size: 1.5rem !important;
              justify-content: center;
            }
        }
    `
    document.head.appendChild(styleSheet)
}
