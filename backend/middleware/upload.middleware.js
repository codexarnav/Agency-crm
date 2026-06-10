import multer from 'multer';

const storage = multer.memoryStorage();

const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed'
];

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 100, // 100MB limit
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('video/') ||
            file.mimetype.startsWith('audio/') ||
            file.mimetype.startsWith('text/') ||
            allowedMimeTypes.includes(file.mimetype)
        ) {
            cb(null, true);
        } else {
            cb(new Error(`file type not supported: ${file.mimetype}`), false);
        }
    }
});

export default upload;