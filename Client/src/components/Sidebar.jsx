"use client"

import { useState } from "react"
import logo from ".././assets/LogoFondoBlanco.png"
import { AiOutlineLeft, AiOutlineHome, AiOutlineUser, AiOutlineBarChart } from "react-icons/ai"
import { MdLogout } from "react-icons/md"
import { FaMap } from "react-icons/fa"
import { NavLink } from "react-router-dom"

export function Sidebar() {
    const [isOpen, setIsOpen] = useState(true) 

    const toggleSidebar = () => {
        setIsOpen(!isOpen) // Alternar entre abierto/cerrado
    }

    const linksArray = [
        { label: "Home", icon: <AiOutlineHome />, to: "/Home" },
        { label: "Mapeado Estacionamientos", icon: <FaMap />, to: "/MapeadoEstacionamiento" },
        { label: "Mapeado Restricción", icon: <FaMap />, to: "/MapeadoRestriccion" },
        { label: "Reportes", icon: <AiOutlineBarChart />, to: "/Estadisticas" },
        { label: "Usuarios", icon: <AiOutlineUser />, to: "/Usuarios" },
    ]

    const secondaryLinks = [{ label: "Salir", icon: <MdLogout />, to: "/", onClick: () => setIsOpen(false) }]

    return (
        <div style={{ ...styles.sidebar, width: isOpen ? "280px" : "80px" }}>
            {/* Efectos de fondo */}
            <div style={styles.backgroundGradient}></div>
            <div style={styles.neonAccent}></div>

            {/* Botón para colapsar */}
            <button
                style={styles.toggleButton}
                onClick={toggleSidebar}
                onMouseEnter={(e) => {
                    e.target.style.background = styles.toggleButtonHover.background
                    e.target.style.boxShadow = styles.toggleButtonHover.boxShadow
                }}
                onMouseLeave={(e) => {
                    e.target.style.background = styles.toggleButton.background
                    e.target.style.boxShadow = styles.toggleButton.boxShadow
                }}
            >
                <AiOutlineLeft
                    style={{
                        transform: isOpen ? "rotate(0deg)" : "rotate(180deg)",
                        transition: "transform 0.3s ease",
                        color: "#ffffff",
                        fontSize: "18px",
                    }}
                />
            </button>

            {/* Logo y Título */}
            <div style={styles.logoContainer}>
                <div style={styles.logoWrapper}>
                    <img src={logo || "/placeholder.svg"} alt="Drive Smart Logo" style={styles.logo} />
                    {isOpen && (
                        <div style={styles.titleContainer}>
                            <h2 style={styles.brandTitle}>DriveSmartPro</h2>
                            <p style={styles.brandSubtitle}>Panel de Control</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Enlaces principales */}
            <div style={styles.linksContainer}>
                <div style={styles.sectionTitle}>{isOpen && <span>NAVEGACIÓN</span>}</div>
                {linksArray.map(({ label, icon, to }) => (
                    <NavLink
                        to={to}
                        key={label}
                        style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
                        onMouseEnter={(e) => {
                            if (!e.target.classList.contains("active")) {
                                e.target.style.background = styles.linkHover.background
                                e.target.style.transform = styles.linkHover.transform
                                e.target.style.boxShadow = styles.linkHover.boxShadow
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!e.target.classList.contains("active")) {
                                e.target.style.background = styles.link.background
                                e.target.style.transform = "translateX(0)"
                                e.target.style.boxShadow = "none"
                            }
                        }}
                    >
                        <div style={styles.linkIcon}>{icon}</div>
                        {isOpen && <span style={styles.linkText}>{label}</span>}
                        {isOpen && <div style={styles.linkArrow}>›</div>}
                    </NavLink>
                ))}
            </div>

            {/* Divider */}
            <div style={styles.divider}>
                <div style={styles.dividerLine}></div>
            </div>

            {/* Enlaces secundarios */}
            <div style={styles.linksContainer}>
                {secondaryLinks.map(({ label, icon, to, onClick }) => (
                    <NavLink
                        to={to}
                        key={label}
                        onClick={onClick}
                        style={styles.logoutLink}
                        onMouseEnter={(e) => {
                            e.target.style.background = styles.logoutLinkHover.background
                            e.target.style.color = styles.logoutLinkHover.color
                            e.target.style.transform = styles.logoutLinkHover.transform
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = styles.logoutLink.background
                            e.target.style.color = styles.logoutLink.color
                            e.target.style.transform = "translateX(0)"
                        }}
                    >
                        <div style={styles.linkIcon}>{icon}</div>
                        {isOpen && <span style={styles.linkText}>{label}</span>}
                    </NavLink>
                ))}
            </div>

            {/* Footer */}
            {isOpen && (
                <div style={styles.footer}>
                    <div style={styles.footerText}>
                        <span>v2.1.0</span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Sidebar

const styles = {
    sidebar: {
        height: "100vh",
        background: "linear-gradient(180deg, #1a1a1a 0%, #000000 100%)",
        boxShadow: "4px 0 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(255, 107, 53, 0.1)",
        position: "fixed",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 10,
        borderRight: "1px solid rgba(255, 107, 53, 0.2)",
        overflow: "hidden",
    },
    backgroundGradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "200px",
        background: "linear-gradient(180deg, rgba(255, 107, 53, 0.1) 0%, transparent 100%)",
        pointerEvents: "none",
    },
    neonAccent: {
        position: "absolute",
        top: 0,
        right: 0,
        width: "2px",
        height: "100%",
        background: "linear-gradient(180deg, #ff6b35 0%, transparent 50%, #ff6b35 100%)",
        animation: "neonPulse 3s ease-in-out infinite alternate",
        pointerEvents: "none",
    },
    toggleButton: {
        position: "absolute",
        top: "25px",
        right: "-20px",
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 15px rgba(255, 107, 53, 0.3)",
        transition: "all 0.3s ease",
        zIndex: 11,
    },
    toggleButtonHover: {
        background: "linear-gradient(135deg, #e55a2b 0%, #e67332 100%)",
        boxShadow: "0 6px 20px rgba(255, 107, 53, 0.5)",
    },
    logoContainer: {
        width: "100%",
        padding: "30px 25px 20px 25px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    },
    logoWrapper: {
        display: "flex",
        alignItems: "center",
        gap: "15px",
    },
    logo: {
        width: "50px",
        height: "50px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(255, 107, 53, 0.2)",
        transition: "all 0.3s ease",
    },
    titleContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
    },
    brandTitle: {
        fontSize: "1.4rem",
        fontWeight: "700",
        color: "#ffffff",
        margin: 0,
        letterSpacing: "-0.02em",
    },
    brandSubtitle: {
        fontSize: "0.85rem",
        color: "#ff6b35",
        margin: 0,
        fontWeight: "500",
    },
    sectionTitle: {
        padding: "20px 25px 10px 25px",
        fontSize: "0.75rem",
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.5)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
    },
    linksContainer: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
    },
    link: {
        display: "flex",
        alignItems: "center",
        padding: "15px 25px",
        textDecoration: "none",
        color: "rgba(255, 255, 255, 0.8)",
        transition: "all 0.3s ease",
        position: "relative",
        background: "transparent",
        borderRadius: "0",
        margin: "2px 15px",
        borderRadius: "12px",
    },
    activeLink: {
        background: "linear-gradient(135deg, rgba(255, 107, 53, 0.2) 0%, rgba(255, 140, 66, 0.1) 100%)",
        color: "#ff6b35",
        fontWeight: "600",
        boxShadow: "0 4px 15px rgba(255, 107, 53, 0.1)",
        border: "1px solid rgba(255, 107, 53, 0.3)",
    },
    linkHover: {
        background: "rgba(255, 255, 255, 0.05)",
        transform: "translateX(5px)",
        boxShadow: "0 4px 15px rgba(255, 107, 53, 0.1)",
    },
    linkIcon: {
        fontSize: "1.4rem",
        marginRight: "15px",
        minWidth: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    linkText: {
        fontSize: "0.95rem",
        fontWeight: "500",
        flex: 1,
    },
    linkArrow: {
        fontSize: "1.2rem",
        opacity: 0.5,
        transition: "all 0.3s ease",
    },
    divider: {
        width: "100%",
        padding: "20px 25px",
        display: "flex",
        alignItems: "center",
    },
    dividerLine: {
        height: "1px",
        background: "linear-gradient(90deg, transparent 0%, rgba(255, 107, 53, 0.3) 50%, transparent 100%)",
        width: "100%",
    },
    logoutLink: {
        display: "flex",
        alignItems: "center",
        padding: "15px 25px",
        textDecoration: "none",
        color: "rgba(255, 255, 255, 0.6)",
        transition: "all 0.3s ease",
        margin: "2px 15px",
        borderRadius: "12px",
        background: "transparent",
    },
    logoutLinkHover: {
        background: "rgba(220, 38, 38, 0.1)",
        color: "#ef4444",
        transform: "translateX(5px)",
    },
    footer: {
        marginTop: "auto",
        padding: "20px 25px",
        width: "100%",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    },
    footerText: {
        fontSize: "0.8rem",
        color: "rgba(255, 255, 255, 0.4)",
        textAlign: "center",
    },
}

// Agregar animaciones CSS
if (typeof document !== "undefined") {
    const styleSheet = document.createElement("style")
    styleSheet.textContent = `
        @keyframes neonPulse {
            0% {
                opacity: 0.5;
                box-shadow: 0 0 5px rgba(255, 107, 53, 0.5);
            }
            100% {
                opacity: 1;
                box-shadow: 0 0 20px rgba(255, 107, 53, 0.8);
            }
        }
    `
    document.head.appendChild(styleSheet)
}
