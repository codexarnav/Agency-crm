import {
    createClient,
    getClients,
    updateClient,
    deleteClient
} from "../services/client.service.js";

export const createClientController = async (req, res) => {
    try {
        const client = await createClient(req.body, req.user);
        return res.status(201).json({
            success: true,
            data: client
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const getClientsController = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const clients = await getClients(companyId, req.user);
        return res.status(200).json({
            success: true,
            data: clients
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateClientController = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const clientId = req.params.id;
        const client = await updateClient(clientId, companyId, req.body, req.user);
        return res.status(200).json({
            success: true,
            data: client
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteClientController = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const clientId = req.params.id;
        await deleteClient(clientId, companyId, req.user);
        return res.status(200).json({
            success: true,
            message: "Client deleted successfully"
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};