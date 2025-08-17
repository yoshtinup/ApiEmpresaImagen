const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Configura CORS para permitir todas las solicitudes
app.use(cors());

// Carpeta para guardar las imágenes subidas
const UPLOAD_FOLDER = './uploads';
if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER);
}

// Carpeta separada para guardar archivos Excel
const FILES_FOLDER = './archivos';
if (!fs.existsSync(FILES_FOLDER)) {
    fs.mkdirSync(FILES_FOLDER);
}

// Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_FOLDER);
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Almacenamiento para archivos Excel
const filesStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, FILES_FOLDER);
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Configuración de Multer para subida de archivos
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Tamaño máximo de 5 MB
    fileFilter: (req, file, cb) => {
        console.log('--- Información del archivo recibido ---');
        console.log('Nombre del archivo:', file.originalname);
        console.log('Extensión del archivo:', path.extname(file.originalname).toLowerCase());
        console.log('Tipo MIME del archivo:', file.mimetype);

        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (extname) {
            // Permitir el archivo, ignorando la validación MIME por problemas de detección incorrecta
            cb(null, true);
        } else {
            console.error('Error: Solo se permiten imágenes (jpeg, jpg, png, gif)');
            cb('Error: Solo se permiten imágenes (jpeg, jpg, png, gif)');
        }
    }
});

// Configuración de Multer para subida de archivos Excel
const uploadExcel = multer({
    storage: filesStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Tamaño máximo de 10 MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExt = /\.xlsx$|\.xls$|\.csv$/i.test(ext);
        const allowedMime = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            'application/csv'
        ].includes(file.mimetype);

        if (allowedExt || allowedMime) {
            return cb(null, true);
        }
        cb('Error: Solo se permiten archivos de datos (.xlsx, .xls, .csv)');
    }
});

// Ruta para subir una imagen
app.post('/imagen', upload.single('imagen'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha proporcionado ningún archivo o el archivo no es una imagen válida' });
    }
    res.status(201).json({
    message: 'Imagen subida exitosamente',
    filename: req.file.filename,
    url: `http://localhost:${PORT}/imagen/${req.file.filename}`
    });
});

// Ruta para subir un archivo de datos (Excel, CSV)
app.post('/excel', uploadExcel.single('excel'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha proporcionado ningún archivo o el archivo no es válido' });
    }
    res.status(201).json({
        message: 'Archivo de datos subido exitosamente',
        filename: req.file.filename,
        url: `http://localhost:${PORT}/excel/${req.file.filename}`
    });
});

// Ruta para obtener una imagen por su nombre de archivo
app.get('/imagen/:filename', (req, res) => {
    const filePath = path.join(UPLOAD_FOLDER, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath, { root: '.' });
    } else {
        res.status(404).json({ error: 'Archivo no encontrado' });
    }
});

// Ruta para obtener un archivo Excel por su nombre de archivo
app.get('/excel/:filename', (req, res) => {
    const filePath = path.join(FILES_FOLDER, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath, { root: '.' });
    } else {
        res.status(404).json({ error: 'Archivo no encontrado' });
    }
});

// Ruta para listar todas las imágenes
app.get('/imagen', (req, res) => {
    fs.readdir(UPLOAD_FOLDER, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Error al leer el directorio' });
        }
        const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
        res.json(images);
    });
});

// Ruta para listar todos los archivos Excel
app.get('/excel', (req, res) => {
    fs.readdir(FILES_FOLDER, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Error al leer el directorio' });
        }
        const excels = files.filter(file => /\.(xlsx|xls|csv)$/i.test(file));
        res.json(excels);
    });
});

// Ruta para eliminar una imagen por su nombre de archivo
app.delete('/imagen/:filename', (req, res) => {
    const filePath = path.join(UPLOAD_FOLDER, req.params.filename);
    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error al eliminar el archivo' });
            }
            res.status(200).json({ message: 'Archivo eliminado exitosamente' });
        });
    } else {
        res.status(404).json({ error: 'Archivo no encontrado' });
    }
});

// Ruta para actualizar una imagen por su nombre de archivo
app.put('/imagen/:filename', upload.single('imagen'), (req, res) => {
    const filePath = path.join(UPLOAD_FOLDER, req.params.filename);
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha proporcionado ningún archivo o el archivo no es una imagen válida' });
    }
    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error al eliminar el archivo anterior' });
            }
            res.status(200).json({ message: 'Imagen actualizada exitosamente', filename: req.file.filename });
        });
    } else {
        res.status(404).json({ error: 'Archivo no encontrado para actualizar' });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
