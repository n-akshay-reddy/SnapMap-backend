const multer = require('multer');
const { v4: userId } = require("uuid");
const MIME_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
};

const fileUpload = multer({
    limits: 500000,
    storage: multer.diskStorage({
        destination: (req,file,cb) => {
            cb(null,'uploads/images')
        },
        filename: (req,file,cb) => {
            const ext = MIME_TYPE_MAP[file.mimetype];
            cb(null, userId() + '.' + ext); 
        }
    }),
    fileFilter: (req,file,cb) => {
        const isValid = !!MIME_TYPE_MAP[file.mimetype];
        let error = isValid?null:new Error('Invalid mine type!');
        cb(error,isValid);
    }
});

module.exports = fileUpload;