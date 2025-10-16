"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "../components/Sidebar"
import auto2 from "../assets/auto2.png"
import androidauto1 from "../assets/androidauto1.png"
import app1 from "../assets/app1.png"
import app2 from "../assets/app2.png"
import app3 from "../assets/app3.png"

const CustomPage = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [scrollY, setScrollY] = useState(0)

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY)
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <div style={styles.container}>
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            {/* Main Content */}
            <div
                style={{
                    ...styles.mainContent,
                    marginLeft: sidebarOpen ? "280px" : "80px",
                    transition: "margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
            >
                {/* Background Effects */}
                <div style={styles.backgroundEffects}>
                    <div style={styles.gradientOrb1}></div>
                    <div style={styles.gradientOrb2}></div>
                    <div style={styles.floatingParticles}>
                        <div style={styles.particle1}></div>
                        <div style={styles.particle2}></div>
                        <div style={styles.particle3}></div>
                    </div>
                </div>

                {/* Hero Section */}
                <section style={styles.hero}>
                    <div style={styles.heroContent}>
                        <div style={styles.heroText}>
                            <div style={styles.heroLabel}>
                                <span>🚗 Conducción Inteligente</span>
                            </div>
                            <h1 style={styles.heroTitle}>
                                <span style={styles.titleGradient}>DriveSmartPro</span>
                            </h1>
                            <p style={styles.heroDescription}>
                                Un viaje más seguro comienza contigo. Conduce con inteligencia, vive con seguridad y descubre una nueva
                                forma de moverte por la ciudad.
                            </p>
                            <div style={styles.heroStats}>
                                <div style={styles.statItem}>
                                    <span style={styles.statNumber}>10K+</span>
                                    <span style={styles.statLabel}>Usuarios Activos</span>
                                </div>
                                <div style={styles.statItem}>
                                    <span style={styles.statNumber}>500+</span>
                                    <span style={styles.statLabel}>Estacionamientos</span>
                                </div>
                                <div style={styles.statItem}>
                                    <span style={styles.statNumber}>24/7</span>
                                    <span style={styles.statLabel}>Soporte</span>
                                </div>
                            </div>
                        </div>
                        <div style={styles.heroImageContainer}>
                            <div style={styles.heroImageWrapper}>
                                <img src={auto2 || "/placeholder.svg"} alt="DriveSmartPro Hero" style={styles.heroImage} />
                                <div style={styles.imageGlow}></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mobile App Section */}
                <section style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>
                            <span style={styles.titleAccent}>Aplicación</span> Móvil
                        </h2>
                        <p style={styles.sectionSubtitle}>Experimenta la conducción inteligente desde tu dispositivo móvil</p>
                    </div>
                    <div style={styles.appGallery}>
                        {[app2, app1, app3].map((app, index) => (
                            <div
                                key={index}
                                style={{
                                    ...styles.appCard,
                                    animationDelay: `${index * 0.2}s`,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = styles.appCardHover.transform
                                    e.currentTarget.style.boxShadow = styles.appCardHover.boxShadow
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0) scale(1)"
                                    e.currentTarget.style.boxShadow = styles.appCard.boxShadow
                                }}
                            >
                                <img src={app || "/placeholder.svg"} alt={`App Screenshot ${index + 1}`} style={styles.appImage} />
                                <div style={styles.appCardOverlay}>
                                    <div style={styles.appCardIcon}>📱</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Showcase Section */}
                <section style={styles.showcase}>
                    <div style={styles.showcaseContent}>
                        <div style={styles.showcaseText}>
                            <div style={styles.showcaseLabel}>
                                <span>🌟 Innovación Tecnológica</span>
                            </div>
                            <h2 style={styles.showcaseTitle}>
                                Conoce nuestra <span style={styles.titleAccent}>aplicación</span>
                            </h2>
                            <p style={styles.showcaseDescription}>
                                Aplicación móvil con georreferenciación para espacios de estacionamientos públicos, alertas sobre
                                señalizaciones de vialidad y restricción vehicular con información actualizada de Movilidad Urbana para
                                la ciudad de Cercado Cochabamba.
                            </p>
                            <div style={styles.featureList}>
                                <div style={styles.featureItem}>
                                    <div style={styles.featureIcon}>🗺️</div>
                                    <span>Georreferenciación en tiempo real</span>
                                </div>
                                <div style={styles.featureItem}>
                                    <div style={styles.featureIcon}>🚨</div>
                                    <span>Alertas de restricción vehicular</span>
                                </div>
                                <div style={styles.featureItem}>
                                    <div style={styles.featureIcon}>📍</div>
                                    <span>Localización de estacionamientos</span>
                                </div>
                            </div>
                        </div>
                        <div style={styles.showcaseImageContainer}>
                            <div style={styles.showcaseImageWrapper}>
                                <img
                                    src={androidauto1 || "/placeholder.svg"}
                                    alt="Android Auto Integration"
                                    style={styles.showcaseImage}
                                />
                                <div style={styles.showcaseImageGlow}></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact Section */}
                <section style={styles.contactSection}>
                    <div style={styles.contactContent}>
                        <div style={styles.contactHeader}>
                            <h2 style={styles.contactTitle}>
                                <span style={styles.titleAccent}>Contáctanos</span>
                            </h2>
                            <p style={styles.contactSubtitle}>
                                Envíanos tu correo electrónico y nosotros nos pondremos en contacto contigo
                            </p>
                        </div>
                        <div style={styles.newsletterForm}>
                            <div style={styles.inputWrapper}>
                                <input
                                    type="email"
                                    placeholder="ejemplo@gmail.com"
                                    style={styles.emailInput}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = "#ff6b35"
                                        e.target.style.boxShadow = "0 0 0 3px rgba(255, 107, 53, 0.1)"
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = "rgba(255, 255, 255, 0.2)"
                                        e.target.style.boxShadow = "none"
                                    }}
                                />
                                <button
                                    style={styles.submitButton}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = styles.submitButtonHover.background
                                        e.target.style.transform = styles.submitButtonHover.transform
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = styles.submitButton.background
                                        e.target.style.transform = "translateY(0)"
                                    }}
                                >
                                    <span>Enviar</span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}

export default CustomPage

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
        overflow: "hidden",
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
        top: "10%",
        right: "10%",
        width: "300px",
        height: "300px",
        background: "radial-gradient(circle, rgba(255, 107, 53, 0.1) 0%, transparent 70%)",
        borderRadius: "50%",
        animation: "float 8s ease-in-out infinite",
    },
    gradientOrb2: {
        position: "absolute",
        bottom: "20%",
        left: "20%",
        width: "200px",
        height: "200px",
        background: "radial-gradient(circle, rgba(255, 140, 66, 0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        animation: "float 6s ease-in-out infinite reverse",
    },
    floatingParticles: {
        position: "absolute",
        width: "100%",
        height: "100%",
    },
    particle1: {
        position: "absolute",
        top: "30%",
        left: "15%",
        width: "4px",
        height: "4px",
        backgroundColor: "#ff6b35",
        borderRadius: "50%",
        animation: "particle 4s linear infinite",
    },
    particle2: {
        position: "absolute",
        top: "60%",
        right: "25%",
        width: "3px",
        height: "3px",
        backgroundColor: "#ff8c42",
        borderRadius: "50%",
        animation: "particle 6s linear infinite reverse",
    },
    particle3: {
        position: "absolute",
        bottom: "40%",
        left: "60%",
        width: "2px",
        height: "2px",
        backgroundColor: "#ff6b35",
        borderRadius: "50%",
        animation: "particle 5s linear infinite",
    },
    hero: {
        padding: "80px 40px",
        position: "relative",
        zIndex: 1,
    },
    heroContent: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: "1400px",
        margin: "0 auto",
        gap: "60px",
    },
    heroText: {
        flex: 1,
        maxWidth: "600px",
    },
    heroLabel: {
        display: "inline-block",
        padding: "8px 16px",
        backgroundColor: "rgba(255, 107, 53, 0.1)",
        border: "1px solid rgba(255, 107, 53, 0.3)",
        borderRadius: "20px",
        color: "#ff6b35",
        fontSize: "0.9rem",
        fontWeight: "600",
        marginBottom: "24px",
        animation: "fadeInUp 0.8s ease-out",
    },
    heroTitle: {
        fontSize: "4.5rem",
        fontWeight: "800",
        marginBottom: "24px",
        lineHeight: "1.1",
        animation: "fadeInUp 0.8s ease-out 0.2s both",
    },
    titleGradient: {
        background: "linear-gradient(135deg, #ffffff 0%, #ff6b35 50%, #ffffff 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
    },
    heroDescription: {
        fontSize: "1.3rem",
        color: "rgba(255, 255, 255, 0.8)",
        lineHeight: "1.6",
        marginBottom: "40px",
        animation: "fadeInUp 0.8s ease-out 0.4s both",
    },
    heroStats: {
        display: "flex",
        gap: "40px",
        animation: "fadeInUp 0.8s ease-out 0.6s both",
    },
    statItem: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    statNumber: {
        fontSize: "2rem",
        fontWeight: "700",
        color: "#ff6b35",
        marginBottom: "4px",
    },
    statLabel: {
        fontSize: "0.9rem",
        color: "rgba(255, 255, 255, 0.6)",
        textAlign: "center",
    },
    heroImageContainer: {
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    heroImageWrapper: {
        position: "relative",
        animation: "slideInRight 1s ease-out 0.8s both",
    },
    heroImage: {
        width: "100%",
        maxWidth: "500px",
        height: "auto",
        borderRadius: "20px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
    },
    imageGlow: {
        position: "absolute",
        top: "-20px",
        left: "-20px",
        right: "-20px",
        bottom: "-20px",
        background: "linear-gradient(45deg, rgba(255, 107, 53, 0.2), transparent, rgba(255, 107, 53, 0.2))",
        borderRadius: "30px",
        zIndex: -1,
        animation: "glow 3s ease-in-out infinite alternate",
    },
    section: {
        padding: "80px 40px",
        position: "relative",
        zIndex: 1,
    },
    sectionHeader: {
        textAlign: "center",
        marginBottom: "60px",
    },
    sectionTitle: {
        fontSize: "3rem",
        fontWeight: "700",
        color: "#ffffff",
        marginBottom: "16px",
    },
    titleAccent: {
        color: "#ff6b35",
    },
    sectionSubtitle: {
        fontSize: "1.2rem",
        color: "rgba(255, 255, 255, 0.7)",
        maxWidth: "600px",
        margin: "0 auto",
    },
    appGallery: {
        display: "flex",
        justifyContent: "center",
        gap: "40px",
        maxWidth: "1200px",
        margin: "0 auto",
    },
    appCard: {
        position: "relative",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
        transition: "all 0.4s ease",
        animation: "fadeInUp 0.8s ease-out both",
    },
    appCardHover: {
        transform: "translateY(-10px) scale(1.05)",
        boxShadow: "0 20px 40px rgba(255, 107, 53, 0.2)",
    },
    appImage: {
        width: "250px",
        height: "auto",
        display: "block",
    },
    appCardOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, transparent 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0,
        transition: "opacity 0.3s ease",
    },
    appCardIcon: {
        fontSize: "3rem",
        filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))",
    },
    showcase: {
        padding: "80px 40px",
        position: "relative",
        zIndex: 1,
    },
    showcaseContent: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: "1400px",
        margin: "0 auto",
        gap: "80px",
    },
    showcaseText: {
        flex: 1,
        maxWidth: "600px",
    },
    showcaseLabel: {
        display: "inline-block",
        padding: "8px 16px",
        backgroundColor: "rgba(255, 107, 53, 0.1)",
        border: "1px solid rgba(255, 107, 53, 0.3)",
        borderRadius: "20px",
        color: "#ff6b35",
        fontSize: "0.9rem",
        fontWeight: "600",
        marginBottom: "24px",
    },
    showcaseTitle: {
        fontSize: "3rem",
        fontWeight: "700",
        color: "#ffffff",
        marginBottom: "24px",
        lineHeight: "1.2",
    },
    showcaseDescription: {
        fontSize: "1.2rem",
        color: "rgba(255, 255, 255, 0.8)",
        lineHeight: "1.6",
        marginBottom: "40px",
    },
    featureList: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    featureItem: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        color: "rgba(255, 255, 255, 0.9)",
        fontSize: "1.1rem",
    },
    featureIcon: {
        fontSize: "1.5rem",
        width: "40px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 107, 53, 0.1)",
        borderRadius: "10px",
    },
    showcaseImageContainer: {
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    showcaseImageWrapper: {
        position: "relative",
    },
    showcaseImage: {
        width: "100%",
        maxWidth: "400px",
        height: "auto",
        borderRadius: "20px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
    },
    showcaseImageGlow: {
        position: "absolute",
        top: "-15px",
        left: "-15px",
        right: "-15px",
        bottom: "-15px",
        background: "linear-gradient(45deg, rgba(255, 107, 53, 0.15), transparent, rgba(255, 107, 53, 0.15))",
        borderRadius: "25px",
        zIndex: -1,
        animation: "glow 4s ease-in-out infinite alternate",
    },
    contactSection: {
        padding: "80px 40px",
        position: "relative",
        zIndex: 1,
        background: "linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, transparent 100%)",
    },
    contactContent: {
        maxWidth: "800px",
        margin: "0 auto",
        textAlign: "center",
    },
    contactHeader: {
        marginBottom: "40px",
    },
    contactTitle: {
        fontSize: "3rem",
        fontWeight: "700",
        color: "#ffffff",
        marginBottom: "16px",
    },
    contactSubtitle: {
        fontSize: "1.2rem",
        color: "rgba(255, 255, 255, 0.7)",
        maxWidth: "500px",
        margin: "0 auto",
    },
    newsletterForm: {
        display: "flex",
        justifyContent: "center",
    },
    inputWrapper: {
        display: "flex",
        gap: "16px",
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.05)",
        padding: "8px",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
    },
    emailInput: {
        padding: "16px 20px",
        fontSize: "1rem",
        border: "2px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "12px",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        color: "#ffffff",
        outline: "none",
        transition: "all 0.3s ease",
        width: "300px",
        backdropFilter: "blur(10px)",
    },
    submitButton: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "16px 24px",
        background: "linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)",
        color: "#ffffff",
        border: "none",
        borderRadius: "12px",
        fontSize: "1rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 4px 15px rgba(255, 107, 53, 0.3)",
    },
    submitButtonHover: {
        background: "linear-gradient(135deg, #e55a2b 0%, #e67332 100%)",
        transform: "translateY(-2px)",
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
        
        @keyframes particle {
            0% { transform: translateY(0px) translateX(0px); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100px) translateX(50px); opacity: 0; }
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(50px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes glow {
            0% {
                opacity: 0.5;
                filter: blur(20px);
            }
            100% {
                opacity: 0.8;
                filter: blur(25px);
            }
        }
        
        .app-card:hover .app-card-overlay {
            opacity: 1;
        }
        
        @media (max-width: 768px) {
            .hero-content,
            .showcase-content {
                flex-direction: column;
                text-align: center;
            }
            
            .app-gallery {
                flex-direction: column;
                align-items: center;
            }
            
            .hero-title {
                font-size: 3rem !important;
            }
            
            .section-title,
            .showcase-title,
            .contact-title {
                font-size: 2rem !important;
            }
        }
    `
    document.head.appendChild(styleSheet)
}
