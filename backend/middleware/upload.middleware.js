import multer from 'multer';

const storage = multer.memoryStorage()

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 100,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('video/')) {
            cb(null, true)
        } else {
            cb(new Error('file type not supported'), false)
        }

    }
})

export default upload;