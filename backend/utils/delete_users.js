import prisma from "file:///C:/Users/ARNAV/Desktop/crm-tool/backend/src/config/prisma.js";

const emails = [
    "29akshitasharma@gmail.com",
    "anuarora1208@gmail.com",
    "arnavashishsharma22@gmail.com",
    "arnavashishshrma@gmail.com",
    "deepakvashishtha1122@gmail.com",
    "arnavashishsharma_23ae015@dtu.ac.in"
];

async function main() {
    try {
        console.log("Finding users with emails:", emails);
        const users = await prisma.user.findMany({
            where: {
                email: { in: emails }
            }
        });

        console.log(`Found ${users.length} matching users.`);
        for (const user of users) {
            console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
            
            // Delete / clean up dependent records to avoid foreign key constraints
            
            // 1. Notifications
            const notificationsDeleted = await prisma.notification.deleteMany({
                where: {
                    OR: [
                        { senderId: user.id },
                        { receiverId: user.id }
                    ]
                }
            });
            console.log(`  Deleted ${notificationsDeleted.count} notifications.`);

            // 2. EmployeeAvailability
            const availabilityDeleted = await prisma.employeeAvailability.deleteMany({
                where: {
                    OR: [
                        { employeeId: user.id },
                        { createdById: user.id }
                    ]
                }
            });
            console.log(`  Deleted ${availabilityDeleted.count} availability records.`);

            // 3. Revisions
            const revisionsDeleted = await prisma.revision.deleteMany({
                where: {
                    task: {
                        OR: [
                            { managerId: user.id },
                            { employeeId: user.id }
                        ]
                    }
                }
            });
            console.log(`  Deleted ${revisionsDeleted.count} task revisions.`);

            // 4. PublishingJobs
            const pubJobsDeleted = await prisma.publishingJob.deleteMany({
                where: {
                    OR: [
                        { managerId: user.id },
                        { task: { OR: [ { managerId: user.id }, { employeeId: user.id } ] } }
                    ]
                }
            });
            console.log(`  Deleted ${pubJobsDeleted.count} publishing jobs.`);

            // 5. Tasks
            const tasksDeleted = await prisma.task.deleteMany({
                where: {
                    OR: [
                        { managerId: user.id },
                        { employeeId: user.id }
                    ]
                }
            });
            console.log(`  Deleted ${tasksDeleted.count} tasks.`);

            // 6. Shoot scripts, crew, assets, shoots
            const shootScriptsDeleted = await prisma.shootScript.deleteMany({
                where: {
                    OR: [
                        { employeeId: user.id },
                        { shoot: { OR: [ { managerId: user.id }, { creativeLeadId: user.id } ] } }
                    ]
                }
            });
            console.log(`  Deleted ${shootScriptsDeleted.count} shoot scripts.`);

            const shootCrewDeleted = await prisma.shootCrew.deleteMany({
                where: {
                    OR: [
                        { employeeId: user.id },
                        { shoot: { OR: [ { managerId: user.id }, { creativeLeadId: user.id } ] } }
                    ]
                }
            });
            console.log(`  Deleted ${shootCrewDeleted.count} shoot crew assignments.`);

            const shootAssetsDeleted = await prisma.shootAsset.deleteMany({
                where: {
                    OR: [
                        { uploadedBy: user.id },
                        { shoot: { OR: [ { managerId: user.id }, { creativeLeadId: user.id } ] } }
                    ]
                }
            });
            console.log(`  Deleted ${shootAssetsDeleted.count} shoot assets.`);

            const shootsDeleted = await prisma.shoot.deleteMany({
                where: {
                    OR: [
                        { managerId: user.id },
                        { creativeLeadId: user.id }
                    ]
                }
            });
            console.log(`  Deleted ${shootsDeleted.count} shoots.`);

            // 7. Announcements
            const announcementsDeleted = await prisma.announcement.deleteMany({
                where: {
                    OR: [
                        { createdById: user.id },
                        { specificEmployeeId: user.id }
                    ]
                }
            });
            console.log(`  Deleted ${announcementsDeleted.count} announcements.`);

            // 8. Reports
            const reportsDeleted = await prisma.report.deleteMany({
                where: {
                    managerId: user.id
                }
            });
            console.log(`  Deleted ${reportsDeleted.count} reports.`);

            // 9. Update clients managed by this user (set managerId to null)
            const updatedClients = await prisma.client.updateMany({
                where: { managerId: user.id },
                data: { managerId: null }
            });
            console.log(`  Unlinked ${updatedClients.count} clients managed by this user.`);

            // 10. Update employees managed by this user (set managerId to null)
            const updatedEmployees = await prisma.user.updateMany({
                where: { managerId: user.id },
                data: { managerId: null }
            });
            console.log(`  Unlinked ${updatedEmployees.count} employees managed by this user.`);

            // Finally, delete the user itself
            const deletedUser = await prisma.user.delete({
                where: { id: user.id }
            });
            console.log(`  Successfully deleted user: ${deletedUser.username} (${deletedUser.email})`);
        }
        console.log("All matching users deleted successfully.");
    } catch (e) {
        console.error("Error deleting users:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
