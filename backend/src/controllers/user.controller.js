import { CreateManager, CreateEmployee, ListManagers, ListEmployees, UpdateUser, DeleteUser, ListManagersPerformance } from "../services/user.service.js";

export const createManagerUser = async (req, res) => {
    try {
        const Manager = await CreateManager(req.body, req.user);

        return res.status(201).json({
            success: true,
            message: "Manager Created",
            data: Manager,
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        })
    }
};

export const createEmployeeUser = async (req, res) => {
    try {
        const Employee = await CreateEmployee(req.body, req.user);

        return res.status(201).json({
            success: true,
            message: "Employee Created",
            data: Employee,
        })
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        })
    }
};

export const getManagers = async (req, res) => {
    try {
        const managers = await ListManagers(req.user);
        return res.status(200).json({
            success: true,
            data: managers,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getManagersPerformance = async (req, res) => {
    try {
        const data = await ListManagersPerformance(req.user);
        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getEmployees = async (req, res) => {
    try {
        const employees = await ListEmployees(req.user);
        return res.status(200).json({
            success: true,
            data: employees,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateUserUser = async (req, res) => {
    try {
        const user = await UpdateUser(req.params.id, req.body, req.user);
        return res.status(200).json({
            success: true,
            message: "User Updated",
            data: user,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const deleteUserUser = async (req, res) => {
    try {
        await DeleteUser(req.params.id, req.user);
        return res.status(200).json({
            success: true,
            message: "User Deleted",
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};