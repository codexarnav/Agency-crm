import bcrypt from "bcrypt";

export const comparePassword = async (plainpassword, hashedPassword) => {
    return await bcrypt.compare(plainpassword, hashedPassword);
}