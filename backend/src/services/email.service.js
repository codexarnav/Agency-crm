import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendOnboardingEmail = async (name, email, role, temporaryPassword) => {
    const loginUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const mailOptions = {
        from: `"Agency CRM" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Welcome to Agency CRM - Your Onboarding Credentials",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <div style="background-color: #f97316; padding: 20px; text-align: center; color: white;">
                    <h2 style="margin: 0; font-size: 24px;">Welcome to Agency CRM</h2>
                </div>
                <div style="padding: 20px;">
                    <p>Hello <strong>${name || 'Team Member'}</strong>,</p>
                    <p>An account has been created for you as a <strong>${role}</strong> in Agency CRM.</p>
                    <p>Here are your temporary login credentials:</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold; width: 30%;">Email:</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Temporary Password:</td>
                            <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace; font-size: 14px;">${temporaryPassword}</td>
                        </tr>
                    </table>
                    <p style="color: #ea580c; font-weight: bold;">Important: You will be required to change your password upon your first login for security reasons.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${loginUrl}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log In to Agency CRM</a>
                    </div>
                    <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
                    <p style="word-break: break-all;"><a href="${loginUrl}">${loginUrl}</a></p>
                </div>
                <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd;">
                    <p style="margin: 0;">This is an automated email. Please do not reply directly to this message.</p>
                </div>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Onboarding email sent to ${email}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`Failed to send onboarding email to ${email}:`, error);
        // Do not crash the application, return null so process continues
        return null;
    }
};
