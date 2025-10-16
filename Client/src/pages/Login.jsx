"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import logo from ".././assets/DRIVESMART.png"
import axios from "axios"

const Login = ({ onLogin }) => {
    const [username, setUser] = useState("")
    const [password, setPassword] = useState("")
    const [errors, setErrors] = useState({})
    const [isLoading, setIsLoading] = useState(false)
    const [focusedField, setFocusedField] = useState("")
    const navigate = useNavigate()
    const [showPassword, setShowPassword] = useState(false)

    const common = {
        headers: {
            'ngrok-skip-browser-warning': 'true',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        timeout: 15000,
    };

    // Validar campos
    const validate = () => {
        const errors = {}
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!username.trim()) {
            errors.username = "El correo electrónico es obligatorio."
        } else if (!emailRegex.test(username)) {
            errors.username = "Ingrese un correo electrónico válido."
        }

        if (!password.trim()) {
            errors.password = "La contraseña es obligatoria."
        } else if (password.length < 6) {
            errors.password = "La contraseña debe tener al menos 6 caracteres."
        }

        setErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Manejar envío del formulario
    const handleSubmit = (event) => {
        event.preventDefault()
        if (!validate()) return

        setIsLoading(true)
        axios
            .post(`${process.env.REACT_APP_API_URL}/login`, { username, password }, common)
            .then((response) => {
                console.log("Response:", response.data)
                if (response.data === "Login Successful") {
                    onLogin() // Actualiza el estado global de autenticación
                    navigate("/Home") // Navega a la página principal
                } else {
                    alert(response.data)
                }
            })
            .catch((error) => {
                console.error("Error:", error)
                alert("Ocurrió un error. Inténtalo nuevamente.")
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    return (
        <div style={styles.container}>
            {/* Elementos decorativos */}
            <div style={styles.decorativeElements}>
                <div style={styles.orangeCircle1}></div>
                <div style={styles.orangeCircle2}></div>
                <div style={styles.orangeLine}></div>
            </div>

            <div style={styles.loginSection}>
                <div style={styles.card}>
                    {/* Header */}
                    <div style={styles.header}>
                        <div style={styles.logoContainer}>
                            <img src={logo || "/placeholder.svg"} alt="DriveSmartProLogo" style={styles.logo} />
                        </div>
                        <h1 style={styles.title}>Iniciar Sesión</h1>
                        <p style={styles.subtitle}>Accede a tu cuenta DriveSmartPro</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Correo Electrónico</label>
                            <div style={styles.inputContainer}>
                                <input
                                    type="text"
                                    placeholder="Introduce tu correo electrónico"
                                    value={username}
                                    onChange={(e) => setUser(e.target.value)}
                                    onFocus={() => setFocusedField("username")}
                                    onBlur={() => setFocusedField("")}
                                    style={{
                                        ...styles.input,
                                        ...(focusedField === "username" ? styles.inputFocused : {}),
                                        ...(errors.username ? styles.inputError : {}),
                                    }}
                                />
                                <div style={styles.inputIcon}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                                            stroke={focusedField === "username" ? "#ff6b35" : "#666"}
                                            strokeWidth="2"
                                            fill="none"
                                        />
                                        <polyline
                                            points="22,6 12,13 2,6"
                                            stroke={focusedField === "username" ? "#ff6b35" : "#666"}
                                            strokeWidth="2"
                                            fill="none"
                                        />
                                    </svg>
                                </div>
                            </div>
                            {errors.username && <span style={styles.errorText}>{errors.username}</span>}
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Contraseña</label>
                            <div style={styles.inputContainer}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Introduce tu contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField("password")}
                                    onBlur={() => setFocusedField("")}
                                    style={{
                                        ...styles.input,
                                        ...(focusedField === "password" ? styles.inputFocused : {}),
                                        ...(errors.password ? styles.inputError : {}),
                                    }}
                                />
                                <div style={styles.inputIcon}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"
                                            stroke={focusedField === "password" ? "#ff6b35" : "#666"}
                                            strokeWidth="2.5"
                                            fill="none"
                                        />
                                        <path
                                            d="M7 11V7a5 5 0 0 1 10 0v4"
                                            stroke={focusedField === "password" ? "#ff6b35" : "#666"}
                                            strokeWidth="2.5"
                                            fill="none"
                                        />
                                        <circle cx="12" cy="16" r="1" fill={focusedField === "password" ? "#ff6b35" : "#666"} />
                                    </svg>
                                </div>
                                <div style={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path
                                                d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                                                stroke="#666"
                                                strokeWidth="2"
                                                fill="none"
                                            />
                                            <line x1="1" y1="1" x2="23" y2="23" stroke="#666" strokeWidth="2" />
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path
                                                d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                                stroke="#666"
                                                strokeWidth="2"
                                                fill="none"
                                            />
                                            <circle cx="12" cy="12" r="3" stroke="#666" strokeWidth="2" fill="none" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            {errors.password && <span style={styles.errorText}>{errors.password}</span>}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                ...styles.submitButton,
                                ...(isLoading ? styles.submitButtonDisabled : {}),
                            }}
                            onMouseEnter={(e) => {
                                if (!isLoading) {
                                    e.target.style.background = "linear-gradient(135deg, #e55a2b 0%, #e67332 50%, #e55a2b 100%)"
                                    e.target.style.transform = "translateY(-2px)"
                                    e.target.style.boxShadow = "0 8px 25px rgba(255, 107, 53, 0.4), 0 0 30px rgba(255, 107, 53, 0.3)"
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isLoading) {
                                    e.target.style.background = "linear-gradient(135deg, #ff6b35 0%, #ff8c42 50%, #ff6b35 100%)"
                                    e.target.style.transform = "translateY(0)"
                                    e.target.style.boxShadow = "0 4px 15px rgba(255, 107, 53, 0.3), 0 0 20px rgba(255, 107, 53, 0.2)"
                                }
                            }}
                        >
                            {isLoading ? (
                                <div style={styles.loadingContent}>
                                    <div style={styles.spinner}></div>
                                    <span>Iniciando sesión...</span>
                                </div>
                            ) : (
                                <span>Iniciar Sesión</span>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Login

const styles = {
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#000000",
        position: "relative",
        // overflow: "hidden",
    },
    decorativeElements: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
    },
    orangeCircle1: {
        position: "absolute",
        top: "10%",
        left: "5%",
        width: "100px",
        height: "100px",
        backgroundColor: "#ff6b35",
        borderRadius: "50%",
        opacity: 0.1,
        animation: "pulse 4s ease-in-out infinite",
    },
    orangeCircle2: {
        position: "absolute",
        bottom: "15%",
        right: "10%",
        width: "150px",
        height: "150px",
        backgroundColor: "#ff6b35",
        borderRadius: "50%",
        opacity: 0.05,
        animation: "pulse 6s ease-in-out infinite reverse",
    },
    orangeLine: {
        position: "absolute",
        top: "50%",
        left: "0",
        width: "200px",
        height: "2px",
        backgroundColor: "#ff6b35",
        opacity: 0.3,
        transform: "rotate(45deg)",
    },
    loginSection: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        position: "relative",
        zIndex: 2,
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        padding: "3rem",
        width: "100%",
        maxWidth: "450px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1), 0 0 60px rgba(255, 107, 53, 0.1)",
        border: "1px solid rgba(255, 107, 53, 0.2)",
        animation: "cardGlow 3s ease-in-out infinite alternate",
    },
    header: {
        textAlign: "center",
        marginBottom: "2.5rem",
    },
    logoContainer: {
        marginBottom: "1.5rem",
    },
    logo: {
        width: "200px",
        height: "auto",
    },
    title: {
        fontSize: "2rem",
        fontWeight: "700",
        color: "#000000",
        margin: "0 0 0.5rem 0",
        letterSpacing: "-0.02em",
    },
    subtitle: {
        fontSize: "1rem",
        color: "#666666",
        margin: 0,
        fontWeight: "400",
    },
    form: {
        width: "100%",
    },
    inputGroup: {
        marginBottom: "1.5rem",
    },
    label: {
        display: "block",
        fontSize: "0.9rem",
        fontWeight: "600",
        color: "#000000",
        marginBottom: "0.5rem",
        letterSpacing: "0.01em",
    },
    inputContainer: {
        position: "relative",
    },
    input: {
        width: "100%",
        padding: "1rem 3rem 1rem 3rem",
        borderWidth: "2px",
        borderStyle: "solid",
        borderColor: "#e0e0e0",
        borderRadius: "8px",
        fontSize: "1rem",
        backgroundColor: "#ffffff",
        color: "#000000",
        outline: "none",
        transition: "all 0.3s ease",
        boxSizing: "border-box",
        fontFamily: "inherit",
    },
    inputFocused: {
        borderColor: "#ff6b35",
        boxShadow: "0 0 0 3px rgba(255, 107, 53, 0.1), 0 0 15px rgba(255, 107, 53, 0.2)",
    },
    inputError: {
        borderColor: "#ff4444",
        boxShadow: "0 0 0 3px rgba(255, 68, 68, 0.1)",
    },
    inputIcon: {
        position: "absolute",
        left: "1rem",
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
    },
    errorText: {
        display: "block",
        color: "#ff4444",
        fontSize: "0.85rem",
        marginTop: "0.5rem",
        fontWeight: "500",
    },
    submitButton: {
        width: "100%",
        padding: "1rem",
        background: "linear-gradient(135deg, #ff6b35 0%, #ff8c42 50%, #ff6b35 100%)",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        fontSize: "1.1rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s ease",
        marginTop: "1rem",
        boxShadow: "0 4px 15px rgba(255, 107, 53, 0.3), 0 0 20px rgba(255, 107, 53, 0.2)",
        animation: "buttonGlow 2s ease-in-out infinite alternate",
    },
    submitButtonDisabled: {
        opacity: 0.7,
        cursor: "not-allowed",
        boxShadow: "none",
        animation: "none",
    },
    loadingContent: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
    },
    spinner: {
        width: "20px",
        height: "20px",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        borderTop: "2px solid #ffffff",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
    },
    passwordToggle: {
        position: "absolute",
        right: "1rem",
        top: "50%",
        transform: "translateY(-50%)",
        cursor: "pointer",
        fontSize: "1.2rem",
        userSelect: "none",
    },
    "@media (max-width: 768px)": {
        container: {
            flexDirection: "column",
        },
        loginSection: {
            padding: "1rem",
        },
        card: {
            padding: "2rem 1.5rem",
            maxWidth: "100%",
        },
        title: {
            fontSize: "1.75rem",
        },
    },
}

// Agregar animaciones CSS
if (typeof document !== "undefined") {
    const styleSheet = document.createElement("style")
    styleSheet.textContent = `
        @keyframes pulse {
            0%, 100% { 
                transform: scale(1);
                opacity: 0.1;
            }
            50% { 
                transform: scale(1.1);
                opacity: 0.2;
            }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes cardGlow {
            0% {
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 0 60px rgba(255, 107, 53, 0.1);
            }
            100% {
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 0 80px rgba(255, 107, 53, 0.2);
            }
        }
        
        @keyframes buttonGlow {
            0% {
                box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3), 0 0 20px rgba(255, 107, 53, 0.2);
            }
            100% {
                box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4), 0 0 30px rgba(255, 107, 53, 0.3);
            }
        }
    `
    document.head.appendChild(styleSheet)
}
