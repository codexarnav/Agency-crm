import cloudinary from "./cloudinary.js";

export const uploadToCloudinary = async (
    fileBuffer,
    folder = "agencyflow/assets",
    resourceType = "auto"
) => {

    return new Promise(
        (resolve, reject) => {

            cloudinary.uploader
                .upload_stream(
                    {
                        folder: folder,
                        resource_type: resourceType
                    },

                    (error, result) => {

                        if (error)
                            reject(error);

                        resolve(result);
                    }
                )
                .end(fileBuffer);
        }
    );
};