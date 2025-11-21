"use client"

import { useState, useRef, useEffect } from "react"
import axios from "axios"
import { MapContainer, TileLayer, Polyline, Popup, Circle } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import Sidebar from "../components/Sidebar"
import { HiChartBar, HiArrowTrendingUp, HiClock, HiMapPin, HiCalendar, HiCheckCircle, HiXCircle } from "react-icons/hi2"
import { MdNavigation, MdGpsFixed, MdTrendingUp } from "react-icons/md"
import L from "leaflet"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

const API_URL = process.env.REACT_APP_API_URL 

export default function Estadisticas() {
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [stats, setStats] = useState({
        totalViajes: 0,
        viajesCompletados: 0,
        viajesCancelados: 0,
        kmRecorridos: 0,
        minutosAhorrados: 0,
        tasaExito: 0,
        tiempoPromedioBusqueda: 0,
        distanciaPromedio: 0,
        viajesPorDia: 0,
    })
    const [viajesPorDia, setViajesPorDia] = useState([])
    const [viajesPorMes, setViajesPorMes] = useState([])
    const [topCalles, setTopCalles] = useState([]) 

    const [heatmapData, setHeatmapData] = useState([])
    const [polylinesMock, setPolylinesMock] = useState([])
    const [zonasHeatmapData, setZonasHeatmapData] = useState([])
    const [trayectoriasMock, setTrayectoriasMock] = useState([])

    const [encontroEstacionamientoPorDia, setEncontroEstacionamientoPorDia] = useState([])
    const [porcentajeExito, setPorcentajeExito] = useState({
        encontro: 0,
        noEncontro: 0,
        porcentajeEncontro: 0,
        porcentajeNoEncontro: 0,
    })
    const [tasasExito, setTasasExito] = useState({
        general: { completados: 0, cancelados: 0, total: 0, porcentaje: "0" },
        destino: { encontroEnDestino: 0, noEncontroEnDestino: 0, total: 0, porcentaje: "0" },
        georeferenciacion: { exitosGeo: 0, fallosGeo: 0, total: 0, porcentaje: "0" },
    })
    const [evolucionTasas, setEvolucionTasas] = useState([])

    const [regresionHoraExito, setRegresionHoraExito] = useState({
        datos: [],
        pendiente: 0,
        intercepto: 0,
        r2: 0,
        ecuacion: "",
    })
    // Elimado estado regresionDistanciaTiempo
    const [regresionDistanciaTiempo, setRegresionDistanciaTiempo] = useState({
        datos: [],
        pendiente: 0,
        intercepto: 0,
        r2: 0,
        ecuacion: "",
    })

    const [regresionViajesDia, setRegresionViajesDia] = useState({
        datos: [],
        pendiente: 0,
        intercepto: 0,
        r2: 0,
        ecuacion: "",
    })

    const [regresionViajesAcumulados, setRegresionViajesAcumulados] = useState({
        datos: [],
        pendiente: 0,
        intercepto: 0,
        r2: 0,
        ecuacion: "",
    })

    const [regresionViajesZona, setRegresionViajesZona] = useState({
        datos: [],
        pendiente: 0,
        intercepto: 0,
        r2: 0,
        ecuacion: "",
    })

    const [regresionTotalCompletados, setRegresionTotalCompletados] = useState({
        datos: [],
        pendiente: 0,
        intercepto: 0,
        r2: 0,
        ecuacion: "",
    })

    const [selectedPeriod, setSelectedPeriod] = useState("all")
    const [heatmapView, setHeatmapView] = useState("calles")

    // Filtros para "Viajes por Día de la Semana"
    const [selectedMonthWeekly, setSelectedMonthWeekly] = useState("all")
    const [selectedWeekWeekly, setSelectedWeekWeekly] = useState("all")

    // Filtros para "Viajes por Mes"
    const [selectedYearMonthly, setSelectedYearMonthly] = useState("2025")

    // Filtros para "Éxito en Encontrar Estacionamiento"
    const [selectedYearLine, setSelectedYearLine] = useState("2025")
    const [selectedMonthLine, setSelectedMonthLine] = useState("all")

    // Filtros para "Tasa de Éxito General"
    const [selectedYearPie, setSelectedYearPie] = useState("2025")
    const [selectedMonthPie, setSelectedMonthPie] = useState("all")

    const scrollRef1 = useRef(null)
    const scrollRef2 = useRef(null)
    const [isDragging1, setIsDragging1] = useState(false)
    const [isDragging2, setIsDragging2] = useState(false)
    const [startX1, setStartX1] = useState(0)
    const [startX2, setStartX2] = useState(0)
    const [scrollLeft1, setScrollLeft1] = useState(0)
    const [scrollLeft2, setScrollLeft2] = useState(0)

    const commonHeaders = {
        "ngrok-skip-browser-warning": "true",
        Accept: "application/json",
        "Content-Type": "application/json",
    }

    const transformGeometry = (geometry, type) => {
        if (!geometry) return []

        const geojson = JSON.parse(geometry)

        if (type === "LINESTRING") {
            // Invertir coordenadas de [lng, lat] a [lat, lng]
            return geojson.coordinates.map((coord) => [coord[1], coord[0]])
        } else if (type === "POINT") {
            // Para puntos, retornar [lat, lng]
            return [geojson.coordinates[1], geojson.coordinates[0]]
        }

        return []
    }

    const fetchEstadisticasIniciales = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const url = `${API_URL}/api/estadisticas`
            console.log("Fetching estadisticas iniciales from:", url)

            const response = await axios.get(url, {
                headers: commonHeaders,
                timeout: 15000,
            })
            const data = response.data

            console.log("Estadisticas data received:", {
                polylines_count: data.polylinesMock?.length || 0,
                trayectorias_count: data.trayectoriasMock?.length || 0,
                heatmap_count: data.heatmapData?.length || 0,
            })

            // Stats principales
            setStats(data.stats || {})

            // Viajes por día
            setViajesPorDia(data.viajesPorDia || [])

            // Viajes por mes
            setViajesPorMes(data.viajesPorMes || [])

            // Top calles (Added this line based on update)
            setTopCalles(data.topCalles || [])

            // Heatmap data (calles más parqueadas)
            setHeatmapData(data.heatmapData || [])

            // Polylines (calles con geometría)
            console.log("Polylines recibidos:", data.polylinesMock?.length || 0)
            setPolylinesMock(data.polylinesMock || [])

            // Zonas heatmap (puntos de calor)
            setZonasHeatmapData(data.zonasHeatmapData || [])

            // Trayectorias (rutas completas de viajes)
            console.log("[Trayectorias recibidas:", data.trayectoriasMock?.length || 0)
            setTrayectoriasMock(data.trayectoriasMock || [])

            // Encontró estacionamiento por día
            setEncontroEstacionamientoPorDia(data.encontroEstacionamientoPorDia || [])

            // Porcentaje de éxito
            setPorcentajeExito(
                data.porcentajeExito || {
                    encontro: 0,
                    noEncontro: 0,
                    porcentajeEncontro: 0,
                    porcentajeNoEncontro: 0,
                },
            )

            setTasasExito(
                data.tasasExito || {
                    general: { completados: 0, cancelados: 0, total: 0, porcentaje: "0" },
                    destino: { encontroEnDestino: 0, noEncontroEnDestino: 0, total: 0, porcentaje: "0" },
                    georeferenciacion: { exitosGeo: 0, fallosGeo: 0, total: 0, porcentaje: "0" },
                },
            )

            setEvolucionTasas(data.evolucionTasas || [])

            setRegresionHoraExito(
                data.regresionHoraExito || {
                    datos: [],
                    pendiente: 0,
                    intercepto: 0,
                    r2: 0,
                    ecuacion: "",
                },
            )

            setRegresionDistanciaTiempo(
                data.regresionDistanciaTiempo || {
                    datos: [],
                    pendiente: 0,
                    intercepto: 0,
                    r2: 0,
                    ecuacion: "",
                },
            )

            setRegresionViajesDia(
                data.regresionViajesDia || {
                    datos: [],
                    pendiente: 0,
                    intercepto: 0,
                    r2: 0,
                    ecuacion: "",
                },
            )

            setRegresionViajesAcumulados(
                data.regresionViajesAcumulados || {
                    datos: [],
                    pendiente: 0,
                    intercepto: 0,
                    r2: 0,
                    ecuacion: "",
                },
            )

            setRegresionViajesZona(
                data.regresionViajesZona || {
                    datos: [],
                    pendiente: 0,
                    intercepto: 0,
                    r2: 0,
                    ecuacion: "",
                },
            )
        } catch (err) {
            console.error("Error fetching estadisticas:", err)
            setError(err.response?.data?.message || "Error al cargar las estadísticas. Por favor, intenta de nuevo.")
        } finally {
            setIsLoading(false) 
        }
    }

    const fetchViajesPorDia = async (month, week) => {
        try {
            const params = new URLSearchParams()
            if (month && month !== "all") params.append("month", month)
            if (week && week !== "all") params.append("week", week)

            const url = `${API_URL}/api/estadisticas${params.toString() ? `?${params.toString()}` : ""}`
            console.log("Fetching viajes por dia from:", url)
            const response = await axios.get(url, { headers: commonHeaders, timeout: 15000 })
            setViajesPorDia(response.data.viajesPorDia || [])
        } catch (err) {
            console.error("Error fetching viajes por día:", err)
        }
    }

    const fetchViajesPorMes = async (year) => {
        try {
            const params = new URLSearchParams()
            if (year && year !== "all") params.append("year", year)

            const url = `${API_URL}/api/estadisticas${params.toString() ? `?${params.toString()}` : ""}`
            console.log("Fetching viajes por mes from:", url)
            const response = await axios.get(url, { headers: commonHeaders, timeout: 15000 })
            setViajesPorMes(response.data.viajesPorMes || [])
        } catch (err) {
            console.error("Error fetching viajes por mes:", err)
        }
    }

    const fetchEncontroEstacionamiento = async (year, month) => {
        try {
            const params = new URLSearchParams()
            if (year && year !== "all") params.append("year", year)
            if (month && month !== "all") params.append("month", month)

            const url = `${API_URL}/api/estadisticas${params.toString() ? `?${params.toString()}` : ""}`
            console.log("Fetching encontró estacionamiento from:", url)
            const response = await axios.get(url, { headers: commonHeaders, timeout: 15000 })
            setEncontroEstacionamientoPorDia(response.data.encontroEstacionamientoPorDia || [])
        } catch (err) {
            console.error("Error fetching encontró estacionamiento:", err)
        }
    }

    const fetchPorcentajeExito = async (year, month) => {
        try {
            const params = new URLSearchParams()
            if (year && year !== "all") params.append("year", year)
            if (month && month !== "all") params.append("month", month)

            const url = `${API_URL}/api/estadisticas${params.toString() ? `?${params.toString()}` : ""}`
            console.log("Fetching porcentaje éxito from:", url)
            const response = await axios.get(url, { headers: commonHeaders, timeout: 15000 })
            setPorcentajeExito(
                response.data.porcentajeExito || {
                    encontro: 0,
                    noEncontro: 0,
                    porcentajeEncontro: 0,
                    porcentajeNoEncontro: 0,
                },
            )
            setTasasExito(
                response.data.tasasExito || {
                    general: { completados: 0, cancelados: 0, total: 0, porcentaje: "0" },
                    destino: { encontroEnDestino: 0, noEncontroEnDestino: 0, total: 0, porcentaje: "0" },
                    georeferenciacion: { exitosGeo: 0, fallosGeo: 0, total: 0, porcentaje: "0" },
                },
            )
            setEvolucionTasas(response.data.evolucionTasas || [])
        } catch (err) {
            console.error("Error fetching porcentaje éxito:", err)
        }
    }

    const fetchEstadisticas = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const url = `${API_URL}/api/estadisticas`
            console.log("Fetching estadisticas from:", url)

            const response = await axios.get(url, {
                headers: commonHeaders,
                timeout: 15000,
            })
            const data = response.data

            console.log("Estadisticas data received:", {
                polylines_count: data.polylinesMock?.length || 0,
                trayectorias_count: data.trayectoriasMock?.length || 0,
                heatmap_count: data.heatmapData?.length || 0,
            })

            // Stats principales
            setStats(data.stats || {})

            // Viajes por día
            setViajesPorDia(data.viajesPorDia || [])

            // Viajes por mes
            setViajesPorMes(data.viajesPorMes || [])

            // Top calles (Added this line based on update)
            setTopCalles(data.topCalles || [])

            // Heatmap data (calles más parqueadas)
            setHeatmapData(data.heatmapData || [])

            // Polylines (calles con geometría)
            console.log("Polylines recibidos:", data.polylinesMock?.length || 0)
            setPolylinesMock(data.polylinesMock || [])

            // Zonas heatmap (puntos de calor)
            setZonasHeatmapData(data.zonasHeatmapData || [])

            // Trayectorias (rutas completas de viajes)
            console.log("Trayectorias recibidas:", data.trayectoriasMock?.length || 0)
            setTrayectoriasMock(data.trayectoriasMock || [])

            // Encontró estacionamiento por día
            setEncontroEstacionamientoPorDia(data.encontroEstacionamientoPorDia || [])

            // Porcentaje de éxito
            setPorcentajeExito(
                data.porcentajeExito || {
                    encontro: 0,
                    noEncontro: 0,
                    porcentajeEncontro: 0,
                    porcentajeNoEncontro: 0,
                },
            )

            setTasasExito(
                data.tasasExito || {
                    general: { completados: 0, cancelados: 0, total: 0, porcentaje: "0" },
                    destino: { encontroEnDestino: 0, noEncontroEnDestino: 0, total: 0, porcentaje: "0" },
                    georeferenciacion: { exitosGeo: 0, fallosGeo: 0, total: 0, porcentaje: "0" },
                },
            )

            setEvolucionTasas(data.evolucionTasas || [])

            console.log("Regresion Hora Exito data:", data.regresionHoraExito)
            console.log("Regresion Total Completados data:", data.regresionTotalCompletados)

            setRegresionHoraExito(
                data.regresionHoraExito || {
                    datos: [],
                    pendiente: 0,
                    intercepto: 0,
                    r2: 0,
                    ecuacion: "",
                },
            )

            setRegresionViajesZona(
                data.regresionViajesZona || {
                    datos: [],
                    pendiente: 0,
                    intercepto: 0,
                    r2: 0,
                    ecuacion: "",
                },
            )

            setRegresionTotalCompletados(
                data.regresionTotalCompletados || {
                    datos: [],
                    pendiente: 0,
                    intercepto: 0,
                    r2: 0,
                    ecuacion: "",
                },
            )

            setIsLoading(false) 
        } catch (err) {
            console.error("Error fetching estadisticas:", err)
            setError(err.response?.data?.message || "Error al cargar las estadísticas. Por favor, intenta de nuevo.")
            setIsLoading(false) 
        }
    }


    useEffect(() => {
        fetchEstadisticas()
    }, [])

    const handleMonthWeeklyChange = (month) => {
        setSelectedMonthWeekly(month)
        fetchViajesPorDia(month, selectedWeekWeekly)
    }

    const handleWeekWeeklyChange = (week) => {
        setSelectedWeekWeekly(week)
        fetchViajesPorDia(selectedMonthWeekly, week)
    }

    const handleYearMonthlyChange = (year) => {
        setSelectedYearMonthly(year)
        fetchViajesPorMes(year)
    }

    const handleYearLineChange = (year) => {
        setSelectedYearLine(year)
        fetchEncontroEstacionamiento(year, selectedMonthLine)
    }

    const handleMonthLineChange = (month) => {
        setSelectedMonthLine(month)
        fetchEncontroEstacionamiento(selectedYearLine, month)
    }

    const handleYearPieChange = (year) => {
        setSelectedYearPie(year)
        fetchPorcentajeExito(year, selectedMonthPie)
    }

    const handleMonthPieChange = (month) => {
        setSelectedMonthPie(month)
        fetchPorcentajeExito(selectedYearPie, month)
    }

    const getPolylineColor = (intensidad) => {
        if (intensidad >= 80) return "#ef4444"
        if (intensidad >= 60) return "#f97316"
        if (intensidad >= 40) return "#fbbf24"
        if (intensidad >= 20) return "#22c55e"
        return "#06b6d4"
    }

    const handleMouseDown1 = (e) => {
        setIsDragging1(true)
        setStartX1(e.pageX - scrollRef1.current.offsetLeft)
        setScrollLeft1(scrollRef1.current.scrollLeft)
    }

    const handleMouseDown2 = (e) => {
        setIsDragging2(true)
        setStartX2(e.pageX - scrollRef2.current.offsetLeft)
        setScrollLeft2(scrollRef2.current.scrollLeft)
    }

    const handleMouseLeave1 = () => {
        setIsDragging1(false)
    }

    const handleMouseLeave2 = () => {
        setIsDragging2(false)
    }

    const handleMouseUp1 = () => {
        setIsDragging1(false)
    }

    const handleMouseUp2 = () => {
        setIsDragging2(false)
    }

    const handleMouseMove1 = (e) => {
        if (!isDragging1) return
        e.preventDefault()
        const x = e.pageX - scrollRef1.current.offsetLeft
        const walk = (x - startX1) * 2
        scrollRef1.current.scrollLeft = scrollLeft1 - walk
    }

    const handleMouseMove2 = (e) => {
        if (!isDragging2) return
        e.preventDefault()
        const x = e.pageX - scrollRef2.current.offsetLeft
        const walk = (x - startX2) * 2
        scrollRef2.current.scrollLeft = scrollLeft2 - walk
    }

    const getHeatmapColor = (intensity) => {
        if (intensity >= 0.8) return "#ef4444"
        if (intensity >= 0.6) return "#f97316"
        if (intensity >= 0.4) return "#fbbf24"
        if (intensity >= 0.2) return "#22c55e"
        return "#06b6d4"
    }

    const getHeatmapRadius = (intensity) => {
        return intensity * 600 + 300
    }

    const getZoneColor = (intensidad) => {
        if (intensidad >= 80) return "#ef4444"
        if (intensidad >= 60) return "#f97316"
        if (intensidad >= 40) return "#fbbf24"
        if (intensidad >= 20) return "#22c55e"
        return "#06b6d4"
    }

    const getZoneRadius = (intensidad) => {
        return (intensidad / 100) * 800 + 200
    }

    const maxViajesDia = viajesPorDia.length > 0 ? Math.max(...viajesPorDia.map((d) => d.viajes)) : 1
    const maxViajesMes = viajesPorMes.length > 0 ? Math.max(...viajesPorMes.map((m) => m.viajes)) : 1

    const getIntensityColor = (intensidad) => {
        if (intensidad >= 80) return "from-red-500 to-orange-500"
        if (intensidad >= 60) return "from-orange-500 to-yellow-500"
        if (intensidad >= 40) return "from-yellow-500 to-green-500"
        return "from-green-500 to-blue-500"
    }

    const maxDistancia = 1 // Default values if no data
    const maxTiempo = 1
    const maxEncontro =
        encontroEstacionamientoPorDia.length > 0
            ? Math.max(...encontroEstacionamientoPorDia.map((d) => Math.max(d.encontro, d.noEncontro)))
            : 1
    const maxViajes = 1
    const maxTasaExito = 1
    const maxHora = 23
    const maxTasaExitoHora = 100

    const createSmoothPath = (points) => {
        if (points.length < 2) return ""

        let path = `M ${points[0].x} ${points[0].y}`

        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i]
            const next = points[i + 1]
            const controlX = (current.x + next.x) / 2

            path += ` Q ${current.x} ${current.y}, ${controlX} ${(current.y + next.y) / 2}`
            path += ` Q ${next.x} ${next.y}, ${next.x} ${next.y}`
        }

        return path
    }

    if (isLoading) {
        return (
            <div style={styles.pageContainer}>
                <Sidebar />
                <div style={styles.mainContent}>
                    <div style={styles.loadingContainer}>
                        <div style={styles.spinner}></div>
                        <p style={styles.loadingText}>Cargando estadísticas...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={styles.pageContainer}>
                <Sidebar />
                <div style={styles.mainContent}>
                    <div style={styles.errorContainer}>
                        <HiXCircle size={48} style={{ color: "#ef4444" }} />
                        <h2 style={styles.errorTitle}>Error al cargar estadísticas</h2>
                        <p style={styles.errorMessage}>{error}</p>
                        <button onClick={() => fetchEstadisticas()} style={styles.retryButton}>
                            {" "}
                            {/* Changed to fetchEstadisticas */}
                            Reintentar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!stats) {
        return (
            <div style={styles.pageContainer}>
                <Sidebar />
                <div style={styles.mainContent}>
                    <div style={styles.errorContainer}>
                        <p style={styles.errorMessage}>No hay datos disponibles</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={styles.pageContainer}>
            <Sidebar />
            <div style={styles.mainContent}>
                <div style={styles.container}>
                    {/* Header */}
                    <div style={styles.header}>
                        <div>
                            <h1 style={styles.title}>Estadísticas de Viajes</h1>
                            <p style={styles.subtitle}>Panel de análisis y métricas generales</p>
                        </div>
                        {/* Eliminar filtros generales de período */}
                    </div>

                    {/* Métricas principales */}
                    <div style={styles.metricsGrid}>
                        <MetricCard
                            icon={<HiChartBar size={24} />}
                            title="Total de Viajes"
                            value={stats.totalViajes.toLocaleString()}
                            color="#3b82f6"
                        />
                        <MetricCard
                            icon={<HiCheckCircle size={24} />}
                            title="Viajes Completados"
                            value={stats.viajesCompletados.toLocaleString()}
                            color="#10b981"
                        />
                        <MetricCard
                            icon={<MdNavigation size={24} />}
                            title="Kilómetros Recorridos"
                            value={`${stats.kmRecorridos.toLocaleString()} km`}
                            color="#8b5cf6"
                        />
                        <MetricCard
                            icon={<HiClock size={24} />}
                            title="Minutos Ahorrados"
                            value={`${(stats.minutosAhorrados / 60).toFixed(1)} hrs`}
                            subtitle={`${stats.minutosAhorrados.toLocaleString()} min`}
                            color="#f59e0b"
                        />
                        <MetricCard
                            icon={<MdGpsFixed size={24} />}
                            title="Tasa de Éxito General"
                            value={`${tasasExito?.general?.porcentaje || 0}%`}
                            subtitle="Viajes completados exitosamente"
                            color="#10b981"
                        />
                    </div>

                    {/* Gráficos de barras */}
                    <div style={styles.chartsGrid}>
                        {/* Viajes por día de la semana */}
                        <div style={styles.chartCard}>
                            <div style={styles.chartHeader}>
                                <div style={styles.chartTitleContainer}>
                                    <HiCalendar size={20} style={{ color: "#3b82f6" }} />
                                    <h3 style={styles.chartTitle}>Viajes por Día de la Semana</h3>
                                </div>
                            </div>

                            <div style={styles.chartFilters}>
                                <select
                                    value={selectedMonthWeekly}
                                    onChange={(e) => handleMonthWeeklyChange(e.target.value)}
                                    style={styles.filterSelect}
                                >
                                    <option value="all">Todos los meses</option>
                                    <option value="1">Enero</option>
                                    <option value="2">Febrero</option>
                                    <option value="3">Marzo</option>
                                    <option value="4">Abril</option>
                                    <option value="5">Mayo</option>
                                    <option value="6">Junio</option>
                                    <option value="7">Julio</option>
                                    <option value="8">Agosto</option>
                                    <option value="9">Septiembre</option>
                                    <option value="10">Octubre</option>
                                    <option value="11">Noviembre</option>
                                    <option value="12">Diciembre</option>
                                </select>

                                <select
                                    value={selectedWeekWeekly}
                                    onChange={(e) => handleWeekWeeklyChange(e.target.value)}
                                    style={styles.filterSelect}
                                >
                                    <option value="all">Todas las semanas</option>
                                    <option value="1">Semana 1</option>
                                    <option value="2">Semana 2</option>
                                    <option value="3">Semana 3</option>
                                    <option value="4">Semana 4</option>
                                    <option value="5">Semana 5</option>
                                </select>
                            </div>

                            <div style={styles.chartContent}>
                                {viajesPorDia.map((item) => (
                                    <div key={item.dia} style={styles.barContainer}>
                                        <span style={styles.barLabel}>{item.dia}</span>
                                        <div style={styles.barWrapper}>
                                            <div
                                                style={{
                                                    ...styles.bar,
                                                    width: `${(item.viajes / maxViajesDia) * 100}%`,
                                                    background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                                                }}
                                            >
                                                <span style={styles.barValue}>{item.viajes}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Viajes por mes */}
                        <div style={styles.chartCard}>
                            <div style={styles.chartHeader}>
                                <div style={styles.chartTitleContainer}>
                                    <HiArrowTrendingUp size={20} style={{ color: "#10b981" }} />
                                    <h3 style={styles.chartTitle}>Viajes por Mes</h3>
                                </div>
                            </div>

                            <div style={styles.chartFilters}>
                                <select
                                    value={selectedYearMonthly}
                                    onChange={(e) => handleYearMonthlyChange(e.target.value)}
                                    style={styles.filterSelect}
                                >
                                    <option value="2025">2025</option>
                                    <option value="2024">2024</option>
                                    <option value="2023">2023</option>
                                    <option value="2022">2022</option>
                                </select>
                            </div>

                            <div style={styles.chartContent}>
                                {viajesPorMes.map((item) => (
                                    <div key={item.mes} style={styles.barContainer}>
                                        <span style={styles.barLabel}>{item.mes}</span>
                                        <div style={styles.barWrapper}>
                                            <div
                                                style={{
                                                    ...styles.bar,
                                                    width: `${(item.viajes / maxViajesMes) * 100}%`,
                                                    background: "linear-gradient(90deg, #10b981, #34d399)",
                                                }}
                                            >
                                                <span style={styles.barValue}>{item.viajes}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={styles.chartCard}>
                        <div style={styles.chartHeader}>
                            <div style={styles.chartTitleContainer}>
                                <HiCheckCircle size={20} style={{ color: "#10b981" }} />
                                <h3 style={styles.chartTitle}>Éxito en Encontrar Estacionamiento</h3>
                            </div>
                            <p style={styles.chartSubtitle}>Comparación por día de la semana</p>
                        </div>

                        <div style={styles.chartFilters}>
                            <select
                                value={selectedYearLine}
                                onChange={(e) => handleYearLineChange(e.target.value)}
                                style={styles.filterSelect}
                            >
                                <option value="2025">2025</option>
                                <option value="2024">2024</option>
                                <option value="2023">2023</option>
                                <option value="2022">2022</option>
                            </select>

                            <select
                                value={selectedMonthLine}
                                onChange={(e) => handleMonthLineChange(e.target.value)}
                                style={styles.filterSelect}
                            >
                                <option value="all">Todos los meses</option>
                                <option value="1">Enero</option>
                                <option value="2">Febrero</option>
                                <option value="3">Marzo</option>
                                <option value="4">Abril</option>
                                <option value="5">Mayo</option>
                                <option value="6">Junio</option>
                                <option value="7">Julio</option>
                                <option value="8">Agosto</option>
                                <option value="9">Septiembre</option>
                                <option value="10">Octubre</option>
                                <option value="11">Noviembre</option>
                                <option value="12">Diciembre</option>
                            </select>
                        </div>

                        <div style={styles.lineChartContainer}>
                            <div style={styles.lineChartLegend}>
                                <div style={styles.legendItemInline}>
                                    <div style={{ ...styles.legendDot, backgroundColor: "#10b981" }}></div>
                                    <span style={styles.legendLabel}>Encontró estacionamiento</span>
                                </div>
                                <div style={styles.legendItemInline}>
                                    <div style={{ ...styles.legendDot, backgroundColor: "#f59e0b" }}></div>
                                    <span style={styles.legendLabel}>No encontró</span>
                                </div>
                            </div>

                            <div style={styles.lineChart}>
                                <svg style={styles.lineChartSvg} viewBox="0 0 800 300" preserveAspectRatio="none">
                                    <defs>
                                        {/* Gradient for "Encontró" line */}
                                        <linearGradient id="gradientEncontro" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                        </linearGradient>

                                        {/* Gradient for "No encontró" line */}
                                        <linearGradient id="gradientNoEncontro" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>

                                    {/* Grid lines */}
                                    {[0, 25, 50, 75, 100].map((percent) => (
                                        <line
                                            key={percent}
                                            x1="50"
                                            y1={50 + (250 * (100 - percent)) / 100}
                                            x2="750"
                                            y2={50 + (250 * (100 - percent)) / 100}
                                            stroke="#2a2a2a"
                                            strokeWidth="1"
                                            strokeDasharray="5,5"
                                        />
                                    ))}

                                    {/* Area fill for "Encontró" */}
                                    {encontroEstacionamientoPorDia.length > 0 && (
                                        <path
                                            d={(() => {
                                                const points = encontroEstacionamientoPorDia.map((d, i) => ({
                                                    x: 50 + (i / (encontroEstacionamientoPorDia.length - 1)) * 700,
                                                    y: 50 + (1 - d.encontro / maxEncontro) * 250,
                                                }))
                                                let path = `M 50 300 L ${points[0].x} ${points[0].y}`
                                                for (let i = 0; i < points.length - 1; i++) {
                                                    const current = points[i]
                                                    const next = points[i + 1]
                                                    const cp1x = current.x + (next.x - current.x) / 3
                                                    const cp1y = current.y
                                                    const cp2x = current.x + (2 * (next.x - current.x)) / 3
                                                    const cp2y = next.y
                                                    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`
                                                }
                                                path += ` L 750 300 Z`
                                                return path
                                            })()}
                                            fill="url(#gradientEncontro)"
                                        />
                                    )}

                                    {/* Area fill for "No encontró" */}
                                    {encontroEstacionamientoPorDia.length > 0 && (
                                        <path
                                            d={(() => {
                                                const points = encontroEstacionamientoPorDia.map((d, i) => ({
                                                    x: 50 + (i / (encontroEstacionamientoPorDia.length - 1)) * 700,
                                                    y: 50 + (1 - d.noEncontro / maxEncontro) * 250,
                                                }))
                                                let path = `M 50 300 L ${points[0].x} ${points[0].y}`
                                                for (let i = 0; i < points.length - 1; i++) {
                                                    const current = points[i]
                                                    const next = points[i + 1]
                                                    const cp1x = current.x + (next.x - current.x) / 3
                                                    const cp1y = current.y
                                                    const cp2x = current.x + (2 * (next.x - current.x)) / 3
                                                    const cp2y = next.y
                                                    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`
                                                }
                                                path += ` L 750 300 Z`
                                                return path
                                            })()}
                                            fill="url(#gradientNoEncontro)"
                                        />
                                    )}

                                    {/* Smooth curve for "Encontró" */}
                                    {encontroEstacionamientoPorDia.length > 0 && (
                                        <path
                                            d={(() => {
                                                const points = encontroEstacionamientoPorDia.map((d, i) => ({
                                                    x: 50 + (i / (encontroEstacionamientoPorDia.length - 1)) * 700,
                                                    y: 50 + (1 - d.encontro / maxEncontro) * 250,
                                                }))
                                                let path = `M ${points[0].x} ${points[0].y}`
                                                for (let i = 0; i < points.length - 1; i++) {
                                                    const current = points[i]
                                                    const next = points[i + 1]
                                                    const cp1x = current.x + (next.x - current.x) / 3
                                                    const cp1y = current.y
                                                    const cp2x = current.x + (2 * (next.x - current.x)) / 3
                                                    const cp2y = next.y
                                                    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`
                                                }
                                                return path
                                            })()}
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    )}

                                    {/* Smooth curve for "No encontró" */}
                                    {encontroEstacionamientoPorDia.length > 0 && (
                                        <path
                                            d={(() => {
                                                const points = encontroEstacionamientoPorDia.map((d, i) => ({
                                                    x: 50 + (i / (encontroEstacionamientoPorDia.length - 1)) * 700,
                                                    y: 50 + (1 - d.noEncontro / maxEncontro) * 250,
                                                }))
                                                let path = `M ${points[0].x} ${points[0].y}`
                                                for (let i = 0; i < points.length - 1; i++) {
                                                    const current = points[i]
                                                    const next = points[i + 1]
                                                    const cp1x = current.x + (next.x - current.x) / 3
                                                    const cp1y = current.y
                                                    const cp2x = current.x + (2 * (next.x - current.x)) / 3
                                                    const cp2y = next.y
                                                    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`
                                                }
                                                return path
                                            })()}
                                            fill="none"
                                            stroke="#f59e0b"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    )}

                                    {/* Points with values for "Encontró" */}
                                    {encontroEstacionamientoPorDia.map((d, i) => {
                                        const x = 50 + (i / (encontroEstacionamientoPorDia.length - 1)) * 700
                                        const y = 50 + (1 - d.encontro / maxEncontro) * 250
                                        return (
                                            <g key={`encontro-${i}`}>
                                                <circle cx={x} cy={y} r="6" fill="#0a0a0a" stroke="#10b981" strokeWidth="3" />
                                                <text x={x} y={y - 15} textAnchor="middle" fill="#10b981" fontSize="12" fontWeight="600">
                                                    {d.encontro}
                                                </text>
                                            </g>
                                        )
                                    })}

                                    {/* Points with values for "No encontró" */}
                                    {encontroEstacionamientoPorDia.map((d, i) => {
                                        const x = 50 + (i / (encontroEstacionamientoPorDia.length - 1)) * 700
                                        const y = 50 + (1 - d.noEncontro / maxEncontro) * 250
                                        return (
                                            <g key={`no-encontro-${i}`}>
                                                <circle cx={x} cy={y} r="6" fill="#0a0a0a" stroke="#f59e0b" strokeWidth="3" />
                                                <text x={x} y={y - 15} textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="600">
                                                    {d.noEncontro}
                                                </text>
                                            </g>
                                        )
                                    })}

                                    {/* Y-axis labels */}
                                    {[0, 25, 50, 75, 100].map((percent) => {
                                        const value = Math.round((maxEncontro * percent) / 100)
                                        const y = 50 + (250 * (100 - percent)) / 100
                                        return (
                                            <text key={percent} x="35" y={y + 5} textAnchor="end" fill="#6b7280" fontSize="11">
                                                {value}
                                            </text>
                                        )
                                    })}
                                </svg>

                                {/* X-axis labels */}
                                <div style={styles.lineChartXAxis}>
                                    {encontroEstacionamientoPorDia.map((d) => (
                                        <span key={d.dia} style={styles.lineChartXLabel}>
                                            {d.dia}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: "2rem" }}>
                        <div style={styles.chartHeader}>
                            <div style={styles.chartTitleContainer}>
                                <MdGpsFixed size={20} style={{ color: "#06b6d4" }} />
                                <h3 style={styles.chartTitle}>Tasas de Éxito</h3>
                            </div>
                            <p style={styles.chartSubtitle}>Análisis detallado de éxito en estacionamiento</p>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginTop: "1.5rem" }}>
                            {/* Tasa de Éxito General */}
                            {tasasExito && (
                                <div style={styles.chartCard}>
                                    <div style={{ textAlign: "center", padding: "1rem" }}>
                                        <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#10b981", marginBottom: "1rem" }}>
                                            Tasa de Éxito General
                                        </h4>
                                        <div style={{ position: "relative", width: "200px", height: "200px", margin: "0 auto" }}>
                                            <svg viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
                                                <circle cx="100" cy="100" r="80" fill="none" stroke="#2a2a2a" strokeWidth="20" />
                                                <circle
                                                    cx="100"
                                                    cy="100"
                                                    r="80"
                                                    fill="none"
                                                    stroke="#10b981"
                                                    strokeWidth="20"
                                                    strokeDasharray={`${(2 * Math.PI * 80 * tasasExito.general.porcentaje) / 100} ${2 * Math.PI * 80}`}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: "50%",
                                                    left: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    textAlign: "center",
                                                }}
                                            >
                                                <div style={{ fontSize: "32px", fontWeight: "800", color: "#10b981" }}>
                                                    {tasasExito.general.porcentaje}%
                                                </div>
                                                <div style={{ fontSize: "12px", color: "#6b7280" }}>Viajes completados</div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-around" }}>
                                            <div>
                                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#10b981" }}>
                                                    {tasasExito.general.completados}
                                                </div>
                                                <div style={{ fontSize: "11px", color: "#6b7280", lineHeight: "1.3" }}>
                                                    Viajes completados
                                                    <br />
                                                    con éxito
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#ef4444" }}>
                                                    {tasasExito.general.cancelados}
                                                </div>
                                                <div style={{ fontSize: "11px", color: "#6b7280", lineHeight: "1.3" }}>
                                                    Viajes
                                                    <br />
                                                    cancelados
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tasa de Éxito en Destino */}
                            {tasasExito && (
                                <div style={styles.chartCard}>
                                    <div style={{ textAlign: "center", padding: "1rem" }}>
                                        <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#3b82f6", marginBottom: "1rem" }}>
                                            Éxito en Destino Deseado
                                        </h4>
                                        <div style={{ position: "relative", width: "200px", height: "200px", margin: "0 auto" }}>
                                            <svg viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
                                                <circle cx="100" cy="100" r="80" fill="none" stroke="#2a2a2a" strokeWidth="20" />
                                                <circle
                                                    cx="100"
                                                    cy="100"
                                                    r="80"
                                                    fill="none"
                                                    stroke="#3b82f6"
                                                    strokeWidth="20"
                                                    strokeDasharray={`${(2 * Math.PI * 80 * tasasExito.destino.porcentaje) / 100} ${2 * Math.PI * 80}`}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: "50%",
                                                    left: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    textAlign: "center",
                                                }}
                                            >
                                                <div style={{ fontSize: "32px", fontWeight: "800", color: "#3b82f6" }}>
                                                    {tasasExito.destino.porcentaje}%
                                                </div>
                                                <div style={{ fontSize: "12px", color: "#6b7280" }}>Encontró en destino</div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-around" }}>
                                            <div>
                                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#3b82f6" }}>
                                                    {tasasExito.destino.encontroEnDestino}
                                                </div>
                                                <div style={{ fontSize: "11px", color: "#6b7280", lineHeight: "1.3" }}>
                                                    Viajes encontraron
                                                    <br />
                                                    en destino
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#f59e0b" }}>
                                                    {tasasExito.destino.noEncontroEnDestino}
                                                </div>
                                                <div style={{ fontSize: "11px", color: "#6b7280", lineHeight: "1.3" }}>
                                                    Viajes necesitaron
                                                    <br />
                                                    georeferenciación
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tasa de Éxito de Georeferenciación */}
                            {tasasExito && (
                                <div style={styles.chartCard}>
                                    <div style={{ textAlign: "center", padding: "1rem" }}>
                                        <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#8b5cf6", marginBottom: "1rem" }}>
                                            Éxito en Georeferenciación
                                        </h4>
                                        <div style={{ position: "relative", width: "200px", height: "200px", margin: "0 auto" }}>
                                            <svg viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
                                                <circle cx="100" cy="100" r="80" fill="none" stroke="#2a2a2a" strokeWidth="20" />
                                                <circle
                                                    cx="100"
                                                    cy="100"
                                                    r="80"
                                                    fill="none"
                                                    stroke="#8b5cf6"
                                                    strokeWidth="20"
                                                    strokeDasharray={`${(2 * Math.PI * 80 * tasasExito.georeferenciacion.porcentaje) / 100} ${2 * Math.PI * 80}`}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: "50%",
                                                    left: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    textAlign: "center",
                                                }}
                                            >
                                                <div style={{ fontSize: "32px", fontWeight: "800", color: "#8b5cf6" }}>
                                                    {tasasExito.georeferenciacion.porcentaje}%
                                                </div>
                                                <div style={{ fontSize: "12px", color: "#6b7280" }}>Con georeferenciación</div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-around" }}>
                                            <div>
                                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#8b5cf6" }}>
                                                    {tasasExito.georeferenciacion.exitosGeo}
                                                </div>
                                                <div style={{ fontSize: "11px", color: "#6b7280", lineHeight: "1.3" }}>
                                                    Viajes encontraron con
                                                    <br />
                                                    georeferenciación
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#ef4444" }}>
                                                    {tasasExito.georeferenciacion.fallosGeo}
                                                </div>
                                                <div style={{ fontSize: "11px", color: "#6b7280", lineHeight: "1.3" }}>
                                                    Viajes no encontraron
                                                    <br />
                                                    con georeferenciación
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={styles.heatmapSection}>
                        <div style={styles.chartCard}>
                            <div style={styles.chartHeader}>
                                <div style={styles.chartTitleContainer}>
                                    <HiMapPin size={20} style={{ color: "#ef4444" }} />
                                    <h3 style={styles.chartTitle}>Mapa de Calor de Estacionamientos</h3>
                                </div>
                                <p style={styles.chartSubtitle}>
                                    {heatmapView === "calles"
                                        ? "Visualización de calles más parqueadas basada en id_mapeado"
                                        : heatmapView === "zonas"
                                            ? "Visualización de densidad de actividad por zonas geográficas"
                                            : "Visualización de todas las trayectorias de viajes realizados"}
                                </p>
                            </div>

                            {/* Toggle entre vistas */}
                            <div style={styles.heatmapControls}>
                                <div style={styles.viewToggle}>
                                    <button
                                        onClick={() => setHeatmapView("calles")}
                                        style={{
                                            ...styles.toggleButton,
                                            ...(heatmapView === "calles" ? styles.toggleButtonActive : {}),
                                        }}
                                    >
                                        Vista por Calles
                                    </button>
                                    <button
                                        onClick={() => setHeatmapView("zonas")}
                                        style={{
                                            ...styles.toggleButton,
                                            ...(heatmapView === "zonas" ? styles.toggleButtonActive : {}),
                                        }}
                                    >
                                        Vista por Zonas
                                    </button>
                                    <button
                                        onClick={() => setHeatmapView("trayectorias")}
                                        style={{
                                            ...styles.toggleButton,
                                            ...(heatmapView === "trayectorias" ? styles.toggleButtonActive : {}),
                                        }}
                                    >
                                        Trayectorias
                                    </button>
                                </div>
                            </div>

                            <div style={styles.mapContainer}>
                                <MapContainer
                                    center={
                                        heatmapView === "calles"
                                            ? [-17.3935, -66.157]
                                            : heatmapView === "zonas"
                                                ? [-17.4135, -66.157]
                                                : [-17.3935, -66.157]
                                    }
                                    zoom={heatmapView === "calles" ? 13 : heatmapView === "zonas" ? 12 : 13}
                                    style={{ height: "500px", width: "100%", borderRadius: "12px" }}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />

                                    {heatmapView === "calles" &&
                                        polylinesMock.map((polyline) => {
                                            if (!polyline.latlngs || polyline.latlngs.length === 0) {
                                                console.log("Polyline sin latlngs:", polyline.id)
                                                return null
                                            }

                                            console.log("Renderizando polyline:", {
                                                id: polyline.id,
                                                latlngs_count: polyline.latlngs.length,
                                                color: polyline.color,
                                                first_point: polyline.latlngs[0],
                                            })

                                            return (
                                                <Polyline
                                                    key={polyline.id}
                                                    positions={polyline.latlngs}
                                                    pathOptions={{
                                                        color: polyline.color,
                                                        weight: 6,
                                                        opacity: 0.8,
                                                    }}
                                                >
                                                    <Popup>
                                                        <div style={styles.popupContent}>
                                                            <strong style={{ fontSize: "1rem", color: "#1a1a1a" }}>{polyline.nombre}</strong>
                                                            <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280", fontSize: "0.85rem" }}>
                                                                ID Mapeado: {polyline.id_mapeado}
                                                            </p>
                                                            <p style={{ margin: "0.25rem 0 0 0", color: "#1a1a1a", fontSize: "0.9rem" }}>
                                                                <strong>{polyline.viajes} viajes</strong> ({polyline.intensidad.toFixed(1)}% intensidad)
                                                            </p>
                                                        </div>
                                                    </Popup>
                                                </Polyline>
                                            )
                                        })}

                                    {/* Vista por Zonas - Círculos con gradiente */}
                                    {heatmapView === "zonas" &&
                                        zonasHeatmapData.map((zona, index) => (
                                            <Circle
                                                key={index}
                                                center={[zona.lat, zona.lng]}
                                                radius={getHeatmapRadius(zona.intensity)}
                                                pathOptions={{
                                                    fillColor: getHeatmapColor(zona.intensity),
                                                    fillOpacity: 0.4,
                                                    color: getHeatmapColor(zona.intensity),
                                                    weight: 0,
                                                    opacity: 0,
                                                }}
                                            >
                                                <Popup>
                                                    <div style={styles.popupContent}>
                                                        <strong style={{ fontSize: "1rem", color: "#1a1a1a" }}>Zona de Alta Actividad</strong>
                                                        <p style={{ margin: "0.5rem 0 0 0", color: "#1a1a1a", fontSize: "0.9rem" }}>
                                                            <strong>{zona.viajes} viajes</strong>
                                                        </p>
                                                        <p style={{ margin: "0.25rem 0 0 0", color: "#6b7280", fontSize: "0.85rem" }}>
                                                            Intensidad: {(zona.intensity * 100).toFixed(0)}%
                                                        </p>
                                                    </div>
                                                </Popup>
                                            </Circle>
                                        ))}

                                    {heatmapView === "trayectorias" &&
                                        trayectoriasMock.map((trayectoria) => {
                                            if (!trayectoria.ruta || trayectoria.ruta.length === 0) {
                                                console.log("Trayectoria sin ruta:", trayectoria.id)
                                                return null
                                            }

                                            console.log("Renderizando trayectoria:", {
                                                id: trayectoria.id,
                                                ruta_count: trayectoria.ruta.length,
                                                first_point: trayectoria.ruta[0],
                                            })

                                            return (
                                                <Polyline
                                                    key={trayectoria.id}
                                                    positions={trayectoria.ruta}
                                                    pathOptions={{
                                                        color: "#ff6b35",
                                                        weight: 4,
                                                        opacity: 0.7,
                                                    }}
                                                >
                                                    <Popup>
                                                        <div style={styles.popupContent}>
                                                            <strong style={{ fontSize: "1rem", color: "#1a1a1a" }}>Viaje #{trayectoria.id}</strong>
                                                            <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280", fontSize: "0.85rem" }}>
                                                                Trayectoria completa del viaje
                                                            </p>
                                                            <p style={{ margin: "0.25rem 0 0 0", color: "#1a1a1a", fontSize: "0.85rem" }}>
                                                                Duración: {trayectoria.duracion} | Distancia: {trayectoria.distancia}
                                                            </p>
                                                        </div>
                                                    </Popup>
                                                </Polyline>
                                            )
                                        })}
                                </MapContainer>

                                {/* Leyenda del mapa */}
                                <div style={styles.mapLegend}>
                                    <h4 style={styles.legendTitle}>
                                        {heatmapView === "calles"
                                            ? "Intensidad de Uso"
                                            : heatmapView === "zonas"
                                                ? "Densidad de Actividad"
                                                : "Trayectorias"}
                                    </h4>
                                    {heatmapView === "trayectorias" ? (
                                        <div style={styles.legendItems}>
                                            <div style={styles.legendItem}>
                                                <div style={{ ...styles.legendLine, backgroundColor: "#ff6b35" }}></div>
                                                <span style={styles.legendLabel}>Ruta de Viaje</span>
                                            </div>
                                            <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0.75rem 0 0 0", lineHeight: "1.4" }}>
                                                Cada línea representa la trayectoria completa de un viaje desde el inicio hasta el
                                                estacionamiento
                                            </p>
                                        </div>
                                    ) : (
                                        <div style={styles.legendItems}>
                                            <div style={styles.legendItem}>
                                                <div style={{ ...styles.legendColor, backgroundColor: "#ef4444" }}></div>
                                                <span style={styles.legendLabel}>Muy Alta {heatmapView === "calles" && "(80-100%)"}</span>
                                            </div>
                                            <div style={styles.legendItem}>
                                                <div style={{ ...styles.legendColor, backgroundColor: "#f97316" }}></div>
                                                <span style={styles.legendLabel}>Alta {heatmapView === "calles" && "(60-80%)"}</span>
                                            </div>
                                            <div style={styles.legendItem}>
                                                <div style={{ ...styles.legendColor, backgroundColor: "#fbbf24" }}></div>
                                                <span style={styles.legendLabel}>Media {heatmapView === "calles" && "(40-60%)"}</span>
                                            </div>
                                            <div style={styles.legendItem}>
                                                <div style={{ ...styles.legendColor, backgroundColor: "#22c55e" }}></div>
                                                <span style={styles.legendLabel}>Baja {heatmapView === "calles" && "(20-40%)"}</span>
                                            </div>
                                            <div style={styles.legendItem}>
                                                <div style={{ ...styles.legendColor, backgroundColor: "#06b6d4" }}></div>
                                                <span style={styles.legendLabel}>Muy Baja {heatmapView === "calles" && "(0-20%)"}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Inicio de la sección de regresiones */}
                    <div style={styles.regressionSection}>
                        {/* Regresión 1: Hora del Día vs Tasa de Éxito */}
                        <div style={styles.chartCard}>
                            <div style={styles.chartHeader}>
                                <div style={styles.chartTitleContainer}>
                                    <HiClock size={20} style={{ color: "#8b5cf6" }} />
                                    <h3 style={styles.chartTitle}>Regresión Lineal: Hora del Día vs Tasa de Éxito</h3>
                                </div>
                                <p style={styles.chartSubtitle}>
                                    Análisis predictivo de la probabilidad de encontrar estacionamiento según la hora del día
                                </p>
                            </div>

                            {regresionHoraExito.datos.length > 0 ? (
                                <>
                                    {/* Gráfica de dispersión con línea de regresión */}
                                    <div style={{ position: "relative", marginTop: "2rem" }}>
                                        <svg
                                            viewBox="0 0 900 500"
                                            style={{
                                                width: "100%",
                                                height: "500px",
                                                backgroundColor: "#0f0f0f",
                                                borderRadius: "12px",
                                                border: "1px solid #2a2a2a",
                                            }}
                                        >
                                            {/* Grid lines */}
                                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                                <line
                                                    key={`grid-y-${i}`}
                                                    x1="80"
                                                    y1={50 + i * 70}
                                                    x2="850"
                                                    y2={50 + i * 70}
                                                    stroke="#2a2a2a"
                                                    strokeWidth="1"
                                                    strokeDasharray="5,5"
                                                />
                                            ))}
                                            {[0, 4, 8, 12, 16, 20, 24].map((hora) => (
                                                <line
                                                    key={`grid-x-${hora}`}
                                                    x1={80 + (hora / 24) * 770}
                                                    y1="50"
                                                    x2={80 + (hora / 24) * 770}
                                                    y2="400"
                                                    stroke="#2a2a2a"
                                                    strokeWidth="1"
                                                    strokeDasharray="5,5"
                                                />
                                            ))}

                                            {/* Línea de regresión (naranja/rojo) */}
                                            {/* Cambiado de regresionHoraTiempo a regresionHoraExito y normalizado la Y a 100% */}
                                            <line
                                                x1="80"
                                                y1={400 - (regresionHoraExito.intercepto / 100) * 350}
                                                x2="850"
                                                y2={400 - ((regresionHoraExito.pendiente * 24 + regresionHoraExito.intercepto) / 100) * 350}
                                                stroke="#ff6b35"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                            />

                                            {/* Puntos de dispersión (azul claro) */}
                                            {/* Cambiado de regresionHoraTiempo a regresionHoraExito y normalizado la Y a 100% */}
                                            {regresionHoraExito.datos.map((punto, index) => {
                                                const x = 80 + (punto.hora / 24) * 770
                                                const y = 400 - (punto.tasaExito / 100) * 350
                                                return (
                                                    <g key={index}>
                                                        <circle cx={x} cy={y} r="8" fill="#60a5fa" opacity="0.8" />
                                                        <circle cx={x} cy={y} r="4" fill="#3b82f6" />
                                                    </g>
                                                )
                                            })}

                                            {/* Etiquetas del eje Y (0-100%) */}
                                            {/* Cambiado de regresionHoraTiempo a regresionHoraExito y normalizado la Y a 100% */}
                                            {[0, 20, 40, 60, 80, 100].map((valor, i) => (
                                                <text
                                                    key={`y-label-${i}`}
                                                    x="60"
                                                    y={405 - (valor / 100) * 350}
                                                    fill="#6b7280"
                                                    fontSize="14"
                                                    textAnchor="end"
                                                >
                                                    {valor}%
                                                </text>
                                            ))}

                                            {/* Etiquetas del eje X */}
                                            {[0, 4, 8, 12, 16, 20, 24].map((hora) => (
                                                <text
                                                    key={`x-label-${hora}`}
                                                    x={80 + (hora / 24) * 770}
                                                    y="430"
                                                    fill="#6b7280"
                                                    fontSize="14"
                                                    textAnchor="middle"
                                                >
                                                    {hora}h
                                                </text>
                                            ))}

                                            {/* Título del eje Y */}
                                            <text
                                                x="20"
                                                y="225"
                                                fill="#9ca3af"
                                                fontSize="14"
                                                textAnchor="middle"
                                                transform="rotate(-90 20 225)"
                                            >
                                                Tasa de éxito (%)
                                            </text>

                                            {/* Título del eje X */}
                                            <text x="465" y="470" fill="#9ca3af" fontSize="14" textAnchor="middle">
                                                Hora del día
                                            </text>
                                        </svg>
                                    </div>

                                    {/* Estadísticas de la regresión */}
                                    <div
                                        style={{ marginTop: "2rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}
                                    >
                                        {/* Cambiado de regresionHoraTiempo a regresionHoraExito */}
                                        <div style={styles.statBox}>
                                            <div style={styles.statLabel}>Ecuación</div>
                                            <div style={styles.statValue}>{regresionHoraExito.ecuacion}</div>
                                            <div style={styles.statDescription}>Modelo de regresión lineal</div>
                                        </div>
                                        <div style={styles.statBox}>
                                            <div style={styles.statLabel}>R² (Ajuste)</div>
                                            <div style={styles.statValue}>{(regresionHoraExito.r2 * 100).toFixed(1)}%</div>
                                            <div style={styles.statDescription}>
                                                {regresionHoraExito.r2 > 0.7
                                                    ? "Ajuste fuerte"
                                                    : regresionHoraExito.r2 > 0.4
                                                        ? "Ajuste moderado"
                                                        : "Ajuste débil"}
                                            </div>
                                        </div>
                                        <div style={styles.statBox}>
                                            <div style={styles.statLabel}>Pendiente</div>
                                            {/* Cambiado de regresionHoraTiempo a regresionHoraExito y añadido unidad */}
                                            <div style={styles.statValue}>{regresionHoraExito.pendiente.toFixed(2)}%/h</div>
                                            <div style={styles.statDescription}>
                                                {/* Cambiado de regresionHoraTiempo a regresionHoraExito */}
                                                {regresionHoraExito.pendiente > 0 ? "Éxito aumenta con la hora" : "Éxito disminuye con la hora"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Interpretación */}
                                    <div
                                        style={{
                                            marginTop: "2rem",
                                            backgroundColor: "#0f0f0f",
                                            borderRadius: "12px",
                                            padding: "1.5rem",
                                            border: "1px solid #2a2a2a",
                                        }}
                                    >
                                        <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#ffffff", margin: "0 0 1rem 0" }}>
                                            Interpretación
                                        </h4>
                                        {/* Cambiado de regresionHoraTiempo a regresionHoraExito y ajustado el texto */}
                                        <p style={{ fontSize: "0.9rem", color: "#9ca3af", lineHeight: "1.6", margin: 0 }}>
                                            {regresionHoraExito.pendiente > 0
                                                ? `La tasa de éxito para encontrar estacionamiento tiende a aumentar ${regresionHoraExito.pendiente.toFixed(2)}% por cada hora que pasa en el día. Esto sugiere que es más fácil encontrar estacionamiento en horas más tardías, probablemente debido a menor demanda.`
                                                : `La tasa de éxito para encontrar estacionamiento tiende a disminuir ${Math.abs(regresionHoraExito.pendiente).toFixed(2)}% por cada hora que pasa en el día. Esto sugiere que es más difícil encontrar estacionamiento en horas más tardías, probablemente debido a mayor demanda.`}{" "}
                                            El coeficiente R² de {(regresionHoraExito.r2 * 100).toFixed(1)}% indica que el modelo{" "}
                                            {regresionHoraExito.r2 > 0.7
                                                ? "explica bien"
                                                : regresionHoraExito.r2 > 0.4
                                                    ? "explica moderadamente"
                                                    : "explica parcialmente"}{" "}
                                            la variación en la tasa de éxito.
                                            {regresionHoraExito.r2 > 0.5 &&
                                                " Este patrón puede usarse para recomendar los mejores horarios a los usuarios."}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                                    <p>No hay suficientes datos para calcular la regresión lineal</p>
                                </div>
                            )}
                        </div>

                        {/* Regresión 1: Distancia vs Tiempo - ELIMINADA */}
                        {/* Regresión 2: Viajes por Día vs Completados - ELIMINADA */}
                        {/* Regresión 3: Viajes Acumulados - ELIMINADA */}

                        {regresionTotalCompletados.datos.length > 0 && (
                            <div style={{ marginBottom: "3rem" }}>
                                <div style={styles.chartCard}>
                                    <div style={styles.chartHeader}>
                                        <div style={styles.chartTitleContainer}>
                                            <MdTrendingUp size={24} style={{ color: "#ff6b35" }} />
                                            <h3 style={styles.chartTitle}>Regresión Lineal: Total de Viajes vs Viajes Completados</h3>
                                        </div>
                                        <p style={styles.chartSubtitle}>
                                            Análisis de la relación entre el volumen total de viajes y los viajes completados por día
                                        </p>
                                    </div>

                                    <div style={{ position: "relative", marginTop: "2rem" }}>
                                        <svg
                                            viewBox="0 0 900 500"
                                            style={{
                                                width: "100%",
                                                height: "500px",
                                                backgroundColor: "#0f0f0f",
                                                borderRadius: "12px",
                                                border: "1px solid #2a2a2a",
                                            }}
                                        >
                                            {/* Grid lines */}
                                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                                <line
                                                    key={`grid-y-${i}`}
                                                    x1="80"
                                                    y1={50 + i * 70}
                                                    x2="850"
                                                    y2={50 + i * 70}
                                                    stroke="#2a2a2a"
                                                    strokeWidth="1"
                                                    strokeDasharray="5,5"
                                                />
                                            ))}
                                            {(() => {
                                                const maxTotal = Math.max(...regresionTotalCompletados.datos.map((d) => d.totalViajes), 1)
                                                const steps = [0, 0.25, 0.5, 0.75, 1]
                                                return steps.map((fraction) => (
                                                    <line
                                                        key={`grid-x-${fraction}`}
                                                        x1={80 + fraction * 770}
                                                        y1="50"
                                                        x2={80 + fraction * 770}
                                                        y2="400"
                                                        stroke="#2a2a2a"
                                                        strokeWidth="1"
                                                        strokeDasharray="5,5"
                                                    />
                                                ))
                                            })()}

                                            {/* Línea de regresión desde (0,0) */}
                                            {(() => {
                                                const maxTotal = Math.max(...regresionTotalCompletados.datos.map((d) => d.totalViajes), 1)
                                                const maxCompletados = Math.max(
                                                    ...regresionTotalCompletados.datos.map((d) => d.viajesCompletados),
                                                    1,
                                                )
                                                const y2 = 400 - ((regresionTotalCompletados.pendiente * maxTotal) / maxCompletados) * 350
                                                return (
                                                    <line
                                                        x1="80"
                                                        y1="400"
                                                        x2="850"
                                                        y2={y2}
                                                        stroke="#ff6b35"
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                    />
                                                )
                                            })()}

                                            {/* Puntos de dispersión */}
                                            {(() => {
                                                const maxTotal = Math.max(...regresionTotalCompletados.datos.map((d) => d.totalViajes), 1)
                                                const maxCompletados = Math.max(
                                                    ...regresionTotalCompletados.datos.map((d) => d.viajesCompletados),
                                                    1,
                                                )
                                                return regresionTotalCompletados.datos.map((punto, index) => {
                                                    const x = 80 + (punto.totalViajes / maxTotal) * 770
                                                    const y = 400 - (punto.viajesCompletados / maxCompletados) * 350
                                                    return (
                                                        <g key={index}>
                                                            <circle cx={x} cy={y} r="8" fill="#60a5fa" opacity="0.8" />
                                                            <circle cx={x} cy={y} r="4" fill="#3b82f6" />
                                                        </g>
                                                    )
                                                })
                                            })()}

                                            {/* Etiquetas del eje Y */}
                                            {(() => {
                                                const maxCompletados = Math.max(
                                                    ...regresionTotalCompletados.datos.map((d) => d.viajesCompletados),
                                                    1,
                                                )
                                                return [0, 0.2, 0.4, 0.6, 0.8, 1].map((fraction, i) => {
                                                    const valor = Math.round(maxCompletados * fraction)
                                                    return (
                                                        <text
                                                            key={`y-label-${i}`}
                                                            x="60"
                                                            y={405 - fraction * 350}
                                                            fill="#6b7280"
                                                            fontSize="14"
                                                            textAnchor="end"
                                                        >
                                                            {valor}
                                                        </text>
                                                    )
                                                })
                                            })()}

                                            {/* Etiquetas del eje X */}
                                            {(() => {
                                                const maxTotal = Math.max(...regresionTotalCompletados.datos.map((d) => d.totalViajes), 1)
                                                return [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                                                    const valor = Math.round(maxTotal * fraction)
                                                    return (
                                                        <text
                                                            key={`x-label-${fraction}`}
                                                            x={80 + fraction * 770}
                                                            y="430"
                                                            fill="#6b7280"
                                                            fontSize="14"
                                                            textAnchor="middle"
                                                        >
                                                            {valor}
                                                        </text>
                                                    )
                                                })
                                            })()}

                                            <text
                                                x="20"
                                                y="225"
                                                fill="#9ca3af"
                                                fontSize="14"
                                                textAnchor="middle"
                                                transform="rotate(-90 20 225)"
                                            >
                                                Viajes completados
                                            </text>
                                            <text x="465" y="470" fill="#9ca3af" fontSize="14" textAnchor="middle">
                                                Total de viajes por día
                                            </text>
                                        </svg>
                                    </div>

                                    <div
                                        style={{ marginTop: "2rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}
                                    >
                                        <div style={styles.statBox}>
                                            <div style={styles.statLabel}>Ecuación</div>
                                            <div style={styles.statValue}>{regresionTotalCompletados.ecuacion}</div>
                                            <div style={styles.statDescription}>Modelo de regresión lineal desde (0,0)</div>
                                        </div>
                                        <div style={styles.statBox}>
                                            <div style={styles.statLabel}>R² (Ajuste)</div>
                                            <div style={styles.statValue}>{(regresionTotalCompletados.r2 * 100).toFixed(1)}%</div>
                                            <div style={styles.statDescription}>
                                                {regresionTotalCompletados.r2 > 0.7
                                                    ? "Ajuste fuerte"
                                                    : regresionTotalCompletados.r2 > 0.4
                                                        ? "Ajuste moderado"
                                                        : "Ajuste débil"}
                                            </div>
                                        </div>
                                        <div style={styles.statBox}>
                                            <div style={styles.statLabel}>Tasa de Completados</div>
                                            <div style={styles.statValue}>{(regresionTotalCompletados.pendiente * 100).toFixed(1)}%</div>
                                            <div style={styles.statDescription}>Porcentaje promedio de viajes completados</div>
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            marginTop: "2rem",
                                            backgroundColor: "#0f0f0f",
                                            borderRadius: "12px",
                                            padding: "1.5rem",
                                            border: "1px solid #2a2a2a",
                                        }}
                                    >
                                        <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#ffffff", margin: "0 0 1rem 0" }}>
                                            Interpretación
                                        </h4>
                                        <p style={{ fontSize: "0.9rem", color: "#9ca3af", lineHeight: "1.6", margin: 0 }}>
                                            La pendiente de {regresionTotalCompletados.pendiente.toFixed(2)} indica que por cada viaje
                                            iniciado, se completan aproximadamente {(regresionTotalCompletados.pendiente * 100).toFixed(1)}%
                                            de los viajes. Esta regresión parte de (0,0), mostrando una correlación positiva entre el volumen
                                            total de viajes y los viajes completados. El coeficiente R² de{" "}
                                            {(regresionTotalCompletados.r2 * 100).toFixed(1)}% indica que el modelo{" "}
                                            {regresionTotalCompletados.r2 > 0.9
                                                ? "tiene un ajuste excelente"
                                                : regresionTotalCompletados.r2 > 0.7
                                                    ? "tiene un buen ajuste"
                                                    : "tiene un ajuste moderado"}
                                            , lo que sugiere una tasa de completados{" "}
                                            {regresionTotalCompletados.r2 > 0.9 ? "muy consistente" : "relativamente consistente"} día a día.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function MetricCard({ icon, title, value, subtitle, color }) {
    return (
        <div style={styles.metricCard}>
            <div style={{ ...styles.metricIcon, backgroundColor: `${color}15` }}>
                <div style={{ color }}>{icon}</div>
            </div>
            <div style={styles.metricContent}>
                <p style={styles.metricTitle}>{title}</p>
                <h2 style={styles.metricValue}>{value}</h2>
                {subtitle && <p style={styles.metricSubtitle}>{subtitle}</p>}
            </div>
        </div>
    )
}

const styles = {
    pageContainer: {
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
    },
    mainContent: {
        marginLeft: "280px",
        flex: 1,
        transition: "margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    },
    loadingContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1.5rem",
    },
    spinner: {
        width: "50px",
        height: "50px",
        border: "4px solid #2a2a2a",
        borderTop: "4px solid #3b82f6",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
    },
    loadingText: {
        fontSize: "1.1rem",
        color: "#9ca3af",
        fontWeight: "500",
    },
    errorContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1rem",
        padding: "2rem",
    },
    errorTitle: {
        fontSize: "1.5rem",
        fontWeight: "600",
        color: "#ffffff",
        margin: "0.5rem 0",
    },
    errorMessage: {
        fontSize: "1rem",
        color: "#9ca3af",
        textAlign: "center",
        maxWidth: "500px",
    },
    retryButton: {
        marginTop: "1rem",
        padding: "0.75rem 2rem",
        backgroundColor: "#3b82f6",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        fontSize: "1rem",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    container: {
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        padding: "2rem",
        color: "#ffffff",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
        flexWrap: "wrap",
        gap: "1rem",
    },
    title: {
        fontSize: "2rem",
        fontWeight: "700",
        margin: 0,
        background: "linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
    },
    subtitle: {
        fontSize: "0.95rem",
        color: "#6b7280",
        margin: "0.5rem 0 0 0",
    },
    filterContainer: {
        display: "flex",
        gap: "0.5rem",
        backgroundColor: "#1a1a1a",
        padding: "0.25rem",
        borderRadius: "12px",
        border: "1px solid #2a2a2a",
    },
    filterButton: {
        padding: "0.5rem 1.25rem",
        border: "none",
        borderRadius: "10px",
        backgroundColor: "transparent",
        color: "#9ca3af",
        fontSize: "0.9rem",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    filterButtonActive: {
        backgroundColor: "#3b82f6",
        color: "#ffffff",
    },
    metricsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "1.5rem",
        marginBottom: "2rem",
    },
    metricCard: {
        backgroundColor: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: "16px",
        padding: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        transition: "all 0.3s ease",
        cursor: "pointer",
    },
    metricIcon: {
        width: "56px",
        height: "56px",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    metricContent: {
        flex: 1,
    },
    metricTitle: {
        fontSize: "0.85rem",
        color: "#9ca3af",
        margin: "0 0 0.5rem 0",
        fontWeight: "500",
    },
    metricValue: {
        fontSize: "1.75rem",
        fontWeight: "700",
        margin: 0,
        color: "#ffffff",
    },
    metricSubtitle: {
        fontSize: "0.8rem",
        color: "#6b7280",
        margin: "0.25rem 0 0 0",
    },
    chartsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
        gap: "1.5rem",
        marginBottom: "2rem",
    },
    chartCard: {
        backgroundColor: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: "16px",
        padding: "1.5rem",
    },
    chartHeader: {
        marginBottom: "1.5rem",
    },
    chartTitleContainer: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
    },
    chartTitle: {
        fontSize: "1.1rem",
        fontWeight: "600",
        margin: 0,
        color: "#ffffff",
    },
    chartSubtitle: {
        fontSize: "0.85rem",
        color: "#6b7280",
        margin: "0.5rem 0 0 0",
    },
    chartFilters: {
        display: "flex",
        gap: "0.75rem",
        marginBottom: "1.25rem",
        flexWrap: "wrap",
    },
    filterSelect: {
        padding: "0.5rem 1rem",
        backgroundColor: "#0f0f0f",
        border: "1px solid #2a2a2a",
        borderRadius: "8px",
        color: "#ffffff",
        fontSize: "0.85rem",
        fontWeight: "500",
        cursor: "pointer",
        outline: "none",
        transition: "all 0.2s ease",
    },
    chartContent: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    },
    barContainer: {
        display: "flex",
        alignItems: "center",
        gap: "1rem",
    },
    barLabel: {
        fontSize: "0.9rem",
        color: "#9ca3af",
        minWidth: "40px",
        fontWeight: "500",
    },
    barWrapper: {
        flex: 1,
        height: "36px",
        backgroundColor: "#0f0f0f",
        borderRadius: "8px",
        overflow: "hidden",
        position: "relative",
    },
    bar: {
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingRight: "0.75rem",
        borderRadius: "8px",
        transition: "width 0.5s ease",
        minWidth: "60px",
    },
    barValue: {
        fontSize: "0.85rem",
        fontWeight: "600",
        color: "#ffffff",
    },
    heatmapSection: {
        marginBottom: "2rem",
    },
    heatmapControls: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "0.75rem",
        gap: "1rem",
        flexWrap: "wrap",
    },
    viewToggle: {
        display: "flex",
        gap: "0.5rem",
        backgroundColor: "#0f0f0f",
        padding: "0.25rem",
        borderRadius: "10px",
        border: "1px solid #1f1f1f",
    },
    toggleButton: {
        padding: "0.5rem 1rem",
        border: "none",
        borderRadius: "8px",
        backgroundColor: "transparent",
        color: "#9ca3af",
        fontSize: "0.85rem",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.2s ease",
        whiteSpace: "nowrap",
    },
    toggleButtonActive: {
        backgroundColor: "#ef4444",
        color: "#ffffff",
    },
    mapContainer: {
        position: "relative",
    },
    mapLegend: {
        position: "absolute",
        top: "1rem",
        right: "1rem",
        backgroundColor: "rgba(26, 26, 26, 0.95)",
        border: "1px solid #2a2a2a",
        borderRadius: "12px",
        padding: "1rem",
        zIndex: 1000,
        backdropFilter: "blur(10px)",
        maxWidth: "250px",
    },
    legendTitle: {
        fontSize: "0.9rem",
        fontWeight: "600",
        color: "#ffffff",
        margin: "0 0 0.75rem 0",
    },
    legendItems: {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
    },
    legendItem: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    legendColor: {
        width: "20px",
        height: "20px",
        borderRadius: "4px",
    },
    legendMarker: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
    },
    legendLine: {
        width: "20px",
        height: "3px",
        borderRadius: "2px",
    },
    legendLabel: {
        fontSize: "0.8rem",
        color: "#9ca3af",
    },
    popupContent: {
        padding: "0.5rem",
    },
    regressionSection: {
        marginBottom: "2rem",
    },
    regressionExplanation: {
        marginBottom: "2rem",
    },
    explanationCard: {
        backgroundColor: "#0f0f0f",
        border: "1px solid #2a2a2a",
        borderRadius: "12px",
        padding: "1.25rem",
        marginBottom: "1.5rem",
    },
    explanationTitle: {
        fontSize: "1rem",
        fontWeight: "600",
        color: "#ffffff",
        margin: "0 0 0.75rem 0",
    },
    explanationText: {
        fontSize: "0.9rem",
        color: "#9ca3af",
        lineHeight: "1.6",
        margin: 0,
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
    },
    statBox: {
        backgroundColor: "#0f0f0f",
        border: "1px solid #2a2a2a",
        borderRadius: "12px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
    },
    statLabel: {
        fontSize: "0.8rem",
        color: "#6b7280",
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
    },
    statValue: {
        fontSize: "1.5rem",
        fontWeight: "700",
        color: "#8b5cf6",
    },
    statDescription: {
        fontSize: "0.85rem",
        color: "#9ca3af",
    },
    statHint: {
        fontSize: "0.75rem",
        color: "#9ca3af",
        marginTop: "0.25rem",
    },
    regressionChart: {
        display: "flex",
        gap: "1rem",
        marginBottom: "1.5rem",
        minHeight: "400px",
        minWidth: "600px",
    },
    chartScrollWrapper: {
        overflowX: "auto",
        overflowY: "hidden",
        marginBottom: "1rem",
        paddingBottom: "0.5rem",
        scrollbarWidth: "none", // Firefox
        msOverflowStyle: "none", // IE and Edge
        WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
        userSelect: "none", // Prevent text selection while dragging
    },
    chartAxis: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        flexShrink: 0, // Prevent axis from shrinking
    },
    axisLabel: {
        fontSize: "0.85rem",
        color: "#9ca3af",
        fontWeight: "600",
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
    },
    yAxis: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        paddingRight: "0.5rem",
    },
    yAxisLabel: {
        fontSize: "0.75rem",
        color: "#6b7280",
        textAlign: "right",
        minWidth: "30px",
    },
    scatterPlot: {
        flex: 1,
        position: "relative",
        backgroundColor: "#0f0f0f",
        border: "1px solid #2a2a2a",
        borderRadius: "12px",
        minHeight: "400px",
        minWidth: "500px", // Added minimum width to ensure proper display
    },
    regressionLine: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
    },
    scatterPoint: {
        position: "absolute",
        width: "10px",
        height: "10px",
        backgroundColor: "#3b82f6",
        borderRadius: "50%",
        transform: "translate(-50%, 50%)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: "0 0 10px rgba(59, 130, 246, 0.5)",
    },
    xAxis: {
        position: "absolute",
        bottom: "-30px",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        padding: "0 5px",
    },
    xAxisLabel: {
        fontSize: "0.75rem",
        color: "#6b7280",
    },
    xAxisTitle: {
        textAlign: "center",
        marginTop: "2rem",
        marginBottom: "1.5rem",
    },
    insightsContainer: {
        marginTop: "2rem",
        backgroundColor: "#0f0f0f",
        border: "1px solid #2a2a2a",
        borderRadius: "12px",
        padding: "1.5rem",
    },
    insightsTitle: {
        fontSize: "1rem",
        fontWeight: "600",
        color: "#ffffff",
        margin: "0 0 1rem 0",
    },
    insightsList: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    },
    insightItem: {
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
    },
    insightIcon: {
        fontSize: "1.5rem",
        flexShrink: 0,
    },
    insightLabel: {
        color: "#ffffff",
        fontSize: "0.9rem",
    },
    insightText: {
        color: "#9ca3af",
        fontSize: "0.9rem",
        lineHeight: "1.5",
    },
    regressionGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
        gap: "1.5rem",
        marginBottom: "1.5rem",
    },
    lineChartContainer: {
        marginTop: "1rem",
    },
    lineChartLegend: {
        display: "flex",
        gap: "1.5rem",
        marginBottom: "1.5rem",
        justifyContent: "center",
    },
    legendItemInline: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    legendDot: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
    },
    lineChart: {
        position: "relative",
    },
    lineChartSvg: {
        width: "100%",
        height: "300px",
        backgroundColor: "#0f0f0f",
        borderRadius: "12px",
        border: "1px solid #2a2a2a",
        padding: "0",
    },
    lineChartXAxis: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "0.5rem",
        padding: "0 1rem",
    },
    lineChartXLabel: {
        fontSize: "0.8rem",
        color: "#6b7280",
    },
    pieChartContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2rem",
        marginTop: "1rem",
    },
    pieChartSvg: {
        width: "250px",
        height: "250px",
    },
    pieChartStats: {
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        width: "100%",
    },
    pieStatItem: {
        backgroundColor: "#0f0f0f",
        border: "1px solid #2a2a2a",
        borderRadius: "12px",
        padding: "1.25rem",
    },
    pieStatHeader: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "0.75rem",
    },
    pieStatDot: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
    },
    pieStatLabel: {
        fontSize: "0.85rem",
        color: "#9ca3af",
        fontWeight: "500",
    },
    pieStatValue: {
        fontSize: "1.5rem",
        fontWeight: "700",
        color: "#ffffff",
        marginBottom: "0.25rem",
    },
    pieStatPercent: {
        fontSize: "1rem",
        color: "#6b7280",
    },
    // Styles for the new section
    section: {
        marginBottom: "2rem",
    },
    sectionHeader: {
        marginBottom: "1.5rem",
    },
    sectionTitleContainer: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
    },
    sectionTitle: {
        fontSize: "1.2rem",
        fontWeight: "600",
        color: "#ffffff",
    },
    sectionSubtitle: {
        fontSize: "0.9rem",
        color: "#6b7280",
        margin: "0.5rem 0 0 0",
    },
    // Styles for regression charts
    chartContainer: {
        backgroundColor: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: "16px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
    },
    noData: {
        textAlign: "center",
        padding: "3rem",
        color: "#6b7280",
    },
    interpretation: {
        marginTop: "2rem",
        backgroundColor: "#0f0f0f",
        borderRadius: "12px",
        padding: "1.5rem",
        border: "1px solid #2a2a2a",
    },
}
