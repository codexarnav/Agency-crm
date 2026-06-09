import prisma from "../config/prisma.js";

export const createOrUpdateAsset =
    async (
        clientId,
        data
    ) => {

        const asset =
            await prisma.asset.upsert({

                where: {
                    clientId,
                },

                update: {
                    ...data,
                },

                create: {
                    clientId,
                    ...data,
                },
            });

        return asset;
    };

export const getAssetByClientId = async (
    clientId
) => {

    const asset =
        await prisma.asset.findUnique({
            where: {
                clientId,
            },

            include: {
                client: true,
            },
        });

    return asset;
};

export const getCompanyAssets = async (
    companyId
) => {

    const assets =
        await prisma.asset.findMany({

            where: {
                client: {
                    companyId,
                },
            },

            include: {
                client: true,
            },

            orderBy: {
                createdAt: "desc",
            },
        });

    return assets;
};

export const updateAsset = async (
    clientId,
    data
) => {

    const asset =
        await prisma.asset.update({

            where: {
                clientId,
            },

            data,
        });

    return asset;
};

export const deleteAsset = async (
    clientId
) => {

    await prisma.asset.delete({
        where: {
            clientId,
        },
    });

    return true;
};