"use client"

import { useState, useEffect, useCallback } from "react"
import styled from "styled-components"
import axios from "axios"
import { Sidebar } from "../components/Sidebar"
import { HiUsers, HiEnvelope, HiPhone, HiMapPin } from "react-icons/hi2"
import { MdEdit, MdDelete, MdSettings, MdPersonAdd } from "react-icons/md"

export function Usuarios() {
    const common = {
        headers: {
            'ngrok-skip-browser-warning': 'true',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        timeout: 15000,
    };
    const [usuarios, setUsuarios] = useState([])
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState({
        id_user: 0,
        username: "",
        password: "",
        email: "",
        phone: "",
        address: "",
    })
    const [modal, setModal] = useState(false)
    const [accion, setAccion] = useState("")

    const obtenerUsuarios = useCallback(async () => {
        try {
            console.log("Fetching usuarios from:", `${process.env.REACT_APP_API_URL}/usuarios`)
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/usuarios`, common)
            console.log("Usuarios fetched:", res.data)
            setUsuarios(res.data)
        } catch (error) {
            console.error("Error fetching usuarios:", error.message)
        }
    }, [])

    const insertarUsuario = async () => {
        try {
            console.log("Inserting usuario:", usuarioSeleccionado)
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/usuarios`, usuarioSeleccionado, common)
            console.log("Usuario inserted:", res.data)
            setUsuarios([...usuarios, res.data])
            abrirCerrarModal()
        } catch (error) {
            console.error("Error inserting usuario:", error.message)
            alert("Error al crear usuario: " + error.message)
        }
    }

    const actualizarUsuario = async () => {
        try {
            console.log("Updating usuario:", usuarioSeleccionado)
            const res = await axios.put(`${process.env.REACT_APP_API_URL}/usuarios/` + usuarioSeleccionado.id_user, usuarioSeleccionado, common)
            console.log("Usuario updated:", res.data)
            const dataAuxiliar = usuarios.map((usuario) =>
                usuario.id_user === usuarioSeleccionado.id_user ? res.data : usuario,
            )
            setUsuarios(dataAuxiliar)
            abrirCerrarModal()
        } catch (error) {
            console.error("Error updating usuario:", error.message)
            alert("Error al actualizar usuario: " + error.message)
        }
    }

    const eliminarUsuario = async () => {
        try {
            console.log("Deleting usuario with ID:", usuarioSeleccionado.id_user)
            await axios.delete(`${process.env.REACT_APP_API_URL}/usuarios/` + usuarioSeleccionado.id_user, common)
            console.log("Usuario deleted successfully")
            setUsuarios(usuarios.filter((usuario) => usuario.id_user !== usuarioSeleccionado.id_user))
            abrirCerrarModal()
        } catch (error) {
            console.error("Error deleting usuario:", error.message)
            alert("Error al eliminar usuario: " + error.message)
        }
    }

    const abrirCerrarModal = () => {
        if (!modal) {
            setUsuarioSeleccionado({
                id_user: 0,
                username: "",
                password: "",
                email: "",
                phone: "",
                address: "",
            })
            setAccion("")
        }
        setModal(!modal)
    }

    const seleccionarUsuario = (usuario, caso) => {
        console.log("seleccionarUsuario - Usuario:", usuario, "Caso:", caso)
        setUsuarioSeleccionado(usuario)
        setAccion(caso)
        setModal(true)
    }

    useEffect(() => {
        obtenerUsuarios()
    }, [obtenerUsuarios])

    return (
        <Container>
            <Sidebar />
            <MainContent>
                <Title>
                    <HiUsers size={32} style={{ marginRight: '12px' }} />
                    Gestión de Usuarios
                </Title>
                <AddButton onClick={() => {
                    setUsuarioSeleccionado({
                        id_user: 0,
                        username: "",
                        password: "",
                        email: "",
                        phone: "",
                        address: "",
                    })
                    setAccion("Crear")
                    setModal(true)
                }}>
                    <MdPersonAdd size={20} style={{ marginRight: '8px' }} />
                    Agregar
                </AddButton>

                <TableContainer>
                    <Table>
                        <thead>
                            <TableHeader>
                                <HeaderCell>
                                    <HeaderContent>
                                        <HiUsers size={18} />
                                        <span>Usuario</span>
                                    </HeaderContent>
                                </HeaderCell>
                                <HeaderCell>
                                    <HeaderContent>
                                        <HiEnvelope size={18} />
                                        <span>Email</span>
                                    </HeaderContent>
                                </HeaderCell>
                                <HeaderCell>
                                    <HeaderContent>
                                        <HiPhone size={18} />
                                        <span>Teléfono</span>
                                    </HeaderContent>
                                </HeaderCell>
                                <HeaderCell>
                                    <HeaderContent>
                                        <HiMapPin size={18} />
                                        <span>Dirección</span>
                                    </HeaderContent>
                                </HeaderCell>
                                <HeaderCell>
                                    <HeaderContent>
                                        <MdSettings size={18} />
                                        <span>Acciones</span>
                                    </HeaderContent>
                                </HeaderCell>
                            </TableHeader>
                        </thead>
                        <tbody>
                            {usuarios.map((usuario) => (
                                <TableRow key={usuario.id_user}>
                                    <UserCell>
                                        <UserAvatar>{usuario.username.charAt(0).toUpperCase()}</UserAvatar>
                                        <UserName>{usuario.username}</UserName>
                                    </UserCell>
                                    <DataCell>{usuario.email}</DataCell>
                                    <DataCell>{usuario.phone}</DataCell>
                                    <DataCell>{usuario.address || "NINGUNA"}</DataCell>
                                    <ActionCell>
                                        <EditButton onClick={() => seleccionarUsuario(usuario, "Editar")}>
                                            <MdEdit size={16} />
                                        </EditButton>
                                        <DeleteButton onClick={() => seleccionarUsuario(usuario, "Eliminar")}>
                                            <MdDelete size={16} />
                                        </DeleteButton>
                                    </ActionCell>
                                </TableRow>
                            ))}
                        </tbody>
                    </Table>
                </TableContainer>

                {modal && (
                    <>
                        <ModalOverlay onClick={abrirCerrarModal} />
                        <Modal>
                            {accion === "Eliminar" ? (
                                <>
                                    <ModalHeader>Confirmar Eliminación</ModalHeader>
                                    <ConfirmText>
                                        ¿Estás seguro de que deseas eliminar al usuario <strong>{usuarioSeleccionado.username}</strong>?
                                    </ConfirmText>
                                    <ButtonGroup>
                                        <CancelButton onClick={abrirCerrarModal}>Cancelar</CancelButton>
                                        <DeleteConfirmButton onClick={eliminarUsuario}>
                                            Eliminar
                                        </DeleteConfirmButton>
                                    </ButtonGroup>
                                </>
                            ) : (
                                <>
                                    <ModalHeader>{usuarioSeleccionado.id_user ? "Editar Usuario" : "Crear Usuario"}</ModalHeader>

                                    <FormGroup>
                                        <Label>Username:</Label>
                                        <Input
                                            type="text"
                                            name="username"
                                            onChange={(e) => setUsuarioSeleccionado({ ...usuarioSeleccionado, username: e.target.value })}
                                            value={usuarioSeleccionado.username}
                                        />
                                    </FormGroup>

                                    <FormGroup>
                                        <Label>Password:</Label>
                                        <Input
                                            type="password"
                                            name="password"
                                            onChange={(e) => setUsuarioSeleccionado({ ...usuarioSeleccionado, password: e.target.value })}
                                            value={usuarioSeleccionado.password}
                                        />
                                    </FormGroup>

                                    <FormGroup>
                                        <Label>Email:</Label>
                                        <Input
                                            type="email"
                                            name="email"
                                            onChange={(e) => setUsuarioSeleccionado({ ...usuarioSeleccionado, email: e.target.value })}
                                            value={usuarioSeleccionado.email}
                                        />
                                    </FormGroup>

                                    <FormGroup>
                                        <Label>Phone:</Label>
                                        <Input
                                            type="text"
                                            name="phone"
                                            onChange={(e) => setUsuarioSeleccionado({ ...usuarioSeleccionado, phone: e.target.value })}
                                            value={usuarioSeleccionado.phone}
                                        />
                                    </FormGroup>

                                    <FormGroup>
                                        <Label>Address:</Label>
                                        <Input
                                            type="text"
                                            name="address"
                                            onChange={(e) => setUsuarioSeleccionado({ ...usuarioSeleccionado, address: e.target.value })}
                                            value={usuarioSeleccionado.address}
                                        />
                                    </FormGroup>

                                    <ButtonGroup>
                                        <CancelButton onClick={abrirCerrarModal}>Cancelar</CancelButton>
                                        <SaveButton onClick={() => (usuarioSeleccionado.id_user ? actualizarUsuario() : insertarUsuario())}>
                                            Guardar
                                        </SaveButton>
                                    </ButtonGroup>
                                </>
                            )}
                        </Modal>
                    </>
                )}
            </MainContent>
        </Container>
    )
}

export default Usuarios

const Container = styled.div`
    display: flex;
    min-height: 100vh;
    background-color: #000000;
`

const MainContent = styled.div`
    margin-left: 280px;
    flex: 1;
    padding: 40px;
    position: relative;
    
    @media (max-width: 768px) {
        margin-left: 0;
        padding: 20px;
    }
`

const Title = styled.h1`
    color: #ffffff;
    text-align: center;
    margin-bottom: 30px;
    font-size: 2.5rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
`

const AddButton = styled.button`
    background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
    color: white;
    padding: 12px 24px;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    margin-bottom: 20px;
    font-weight: 600;
    font-size: 1rem;
    box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    
    &:hover {
        background: linear-gradient(135deg, #e55a2b 0%, #e67332 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
    }
`

const TableContainer = styled.div`
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 107, 53, 0.2);
`

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
`

const TableHeader = styled.tr`
    background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
`

const HeaderCell = styled.th`
    padding: 20px 16px;
    text-align: left;
    color: white;
    font-weight: 600;
    font-size: 0.95rem;
    border: none;
`

const HeaderContent = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`

const TableRow = styled.tr`
    transition: all 0.3s ease;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    
    &:hover {
        background-color: rgba(255, 107, 53, 0.05);
    }
    
    &:nth-child(even) {
        background-color: rgba(255, 255, 255, 0.8);
    }
    
    &:nth-child(odd) {
        background-color: rgba(255, 255, 255, 0.6);
    }
`

const UserCell = styled.td`
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
`

const UserAvatar = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #ff6b35;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.1rem;
`

const UserName = styled.span`
    font-weight: 600;
    color: #000000;
`

const DataCell = styled.td`
    padding: 16px;
    color: #000000;
    font-size: 0.95rem;
`

const ActionCell = styled.td`
    padding: 16px;
    display: flex;
    gap: 8px;
`

const EditButton = styled.button`
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    
    &:hover {
        background: rgba(59, 130, 246, 0.2);
        transform: translateY(-2px);
    }
`

const DeleteButton = styled.button`
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    
    &:hover {
        background: rgba(239, 68, 68, 0.2);
        transform: translateY(-2px);
    }
`

const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
    z-index: 1500;
`

const Modal = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 30px;
    border-radius: 20px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
    z-index: 1600;
    width: 90%;
    max-width: 500px;
    border: 2px solid rgba(255, 107, 53, 0.2);
`

const ModalHeader = styled.h3`
    margin-bottom: 25px;
    color: #000000;
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
`

const FormGroup = styled.div`
    margin-bottom: 20px;
`

const Label = styled.label`
    display: block;
    margin-bottom: 8px;
    color: #000000;
    font-weight: 600;
    font-size: 0.9rem;
`

const Input = styled.input`
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
    transition: all 0.3s ease;
    background-color: #ffffff;
    color: #000000;
    box-sizing: border-box;
    
    &:focus {
        border-color: #ff6b35;
        box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
    }
`

const ButtonGroup = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 30px;
`

const CancelButton = styled.button`
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 600;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    background-color: #ffffff;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
        background-color: #f3f4f6;
        border-color: #d1d5db;
    }
`

const SaveButton = styled.button`
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
    color: #ffffff;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
    
    &:hover {
        background: linear-gradient(135deg, #e55a2b 0%, #e67332 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
    }
`

const ConfirmText = styled.p`
    color: #000000;
    font-size: 1rem;
    text-align: center;
    margin-bottom: 30px;
    line-height: 1.5;
`

const DeleteConfirmButton = styled.button`
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    background: #ef4444;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
        background: #dc2626;
        transform: translateY(-2px);
    }
`
