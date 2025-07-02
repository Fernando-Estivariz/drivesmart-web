"use client"

import { useState } from "react"
import { Sidebar } from ".././components/Sidebar"
import MapaRestricciones from ".././components/MapaRestriciones"

const MapeadoRestricciones = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true)

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
                {/* Header Section */}
                <div style={styles.header}>
                    <h1 style={styles.title}>
                        <span style={styles.titleIcon}>🚦</span>
                        Mapeado de <span style={styles.titleAccent}>Restricciones</span> Vehiculares
                    </h1>
                </div>

                {/* Map Container */}
                <div style={styles.mapContainer}>
                    <MapaRestricciones />
                </div>
            </div>
        </div>
    )
}

export default MapeadoRestricciones

const styles = {
    container: {
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#000000",
    },
    mainContent: {
        flex: 1,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
    },
    header: {
        padding: "30px 40px 20px 40px",
        textAlign: "center",
    },
    title: {
        fontSize: "3rem",
        fontWeight: "800",
        color: "#ffffff",
        margin: 0,
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
    mapContainer: {
        flex: 1,
        padding: "0 40px 40px 40px",
    },
}

// Agregar animaciones CSS
if (typeof document !== "undefined") {
    const styleSheet = document.createElement("style")
    styleSheet.textContent = `
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(3deg); }
        }
        
        .content-expanded {
          margin-left: 280px;
        }

        .content-collapsed {
          margin-left: 80px;
        }
        
        @media (max-width: 768px) {
            .content-expanded,
            .content-collapsed {
              margin-left: 0;
            }
            
            .stats-container {
              flex-direction: column;
            }
            
            .map-header {
              flex-direction: column;
              gap: 16px;
              align-items: stretch;
            }
            
            .map-controls {
              justify-content: center;
            }
            
            .actions-grid {
              grid-template-columns: 1fr;
            }
        }
    `
    document.head.appendChild(styleSheet)
}
