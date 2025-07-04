"use client"

import { useState, useEffect } from "react"
import styled from "styled-components"
import axios from "axios"
import { Sidebar } from ".././components/Sidebar"

export function Usuarios() {
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

    const obtenerUsuarios = async () => {
        const res = await axios.get("https://drivesmart-backend-2wnj.onrender.com/usuarios")
        setUsuarios(res.data)
    }

    const insertarUsuario = async () => {
        try {
            const res = await axios.post("https://drivesmart-backend-2wnj.onrender.com/usuarios", usuarioSeleccionado)
            setUsuarios(usuarios.concat(res.data))
            abrirCerrarModal()
        } catch (error) {
            console.error(error)
        }
    }

    const actualizarUsuario = async () => {
        const res = await axios.put("https://drivesmart-backend-2wnj.onrender.com/usuarios/" + usuarioSeleccionado.id_user, usuarioSeleccionado)
        const dataAuxiliar = usuarios.map((usuario) =>
            usuario.id_user === usuarioSeleccionado.id_user ? res.data : usuario,
        )
        setUsuarios(dataAuxiliar)
        abrirCerrarModal()
    }

    const eliminarUsuario = async () => {
        await axios.delete("https://drivesmart-backend-2wnj.onrender.com/usuarios/" + usuarioSeleccionado.id_user)
        setUsuarios(usuarios.filter((usuario) => usuario.id_user !== usuarioSeleccionado.id_user))
    }

    const abrirCerrarModal = () => {
        setModal(!modal)
    }

    const seleccionarUsuario = (usuario, caso) => {
        setUsuarioSeleccionado(usuario)
        caso === "Editar" ? abrirCerrarModal() : eliminarUsuario()
    }

    useEffect(() => {
        obtenerUsuarios()
    }, [])

    return (
        <Container>
            <Sidebar />
            <MainContent>
                <Title>Gestión de Usuarios</Title>
                <AddButton onClick={abrirCerrarModal}>Agregar +</AddButton>

                <TableContainer>
                    <Table>
                        <thead>
                            <TableHeader>
                                <HeaderCell>👤 Usuario</HeaderCell>
                                <HeaderCell>📧 Email</HeaderCell>
                                <HeaderCell>📱 Teléfono</HeaderCell>
                                <HeaderCell>📍 Dirección</HeaderCell>
                                <HeaderCell>⚙️ Acciones</HeaderCell>
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
                                        <EditButton onClick={() => seleccionarUsuario(usuario, "Editar")}>✏️</EditButton>
                                        <DeleteButton onClick={() => seleccionarUsuario(usuario, "Eliminar")}>🗑️</DeleteButton>
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
                        </Modal>
                    </>
                )}
            </MainContent>
        </Container>
    )
}

export default Usuarios

// Styled Components
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
    
    &::before {
        content: '👥 ';
        margin-right: 10px;
    }
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
    font-size: 1rem;
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
    font-size: 1rem;
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
