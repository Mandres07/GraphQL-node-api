const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');

const app = express();

// Define donde y bajo que nombre se guardan los archivos subidos del app
const storage = multer.diskStorage({
   destination: function (req, file, cb) {
      cb(null, 'images');
   },
   filename: function (req, file, cb) {
      cb(null, uuidv4() + '-' + file.originalname)
   }
});

// Define que tipo de archivos van a ser aceptados
const fileFilter = (req, file, cb) => {
   if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
      cb(null, true);
   }
   else {
      cb(null, false);
   }
};

// este bordyparser sirve para recibir y parsear data en el formato: x-www-form-urlencoded, que se usa en los <form></form> de html
// app.use(bodyParser.urlencoded());

// este bordyparser sirve para recibir y parsear data en el formato: application/json que es el que se necesita para APIs
app.use(bodyParser.json());

// este parser sirve para recibir y parsear archivos bajo el formato multipart/form-data, que se usa en los <form></form> de html
// se utilizan el storage y el filtro definidos antes, y se define que los archivos seran uno solo 'single' y se llamara 'image'
app.use(multer({ storage: storage, fileFilter: fileFilter }).single('image'));

// Define la carpera images de la raiz a que se pueda acceder de manera estatica como archivos estaticos de imagen
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
   // Permite hacer request de cualquier dominio, si queremos aceptar algunos dominios solo hacer la lista separado por coma en lugar de *
   res.setHeader('Access-Control-Allow-Origin', '*');
   // Permite definir bajo que metodos se permitiran los request de otros dominios
   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
   // Permite que el cliente defina los headers enumerados (Content-Type y Authorization) en sus request
   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
   next();
});

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
   console.log(error);
   const status = error.statusCode || 500;
   const message = error.message;
   const data = error.data;
   res.status(status).json({
      message: message,
      data: data
   });
});

mongoose.connect('mongodb+srv://Mandres:Mandres.07.mdb@cluster0.qnd1j.mongodb.net/messages?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
   .then(result => {
      console.log('Connected!');
      // creacion de un servidor de node con express
      const server = app.listen(8080);
           
      const io = require('./socket').init(server);

      // Funcion que establece que hacer cuando se da una conexion
      io.on('connection', socket => {
         console.log('Client connected');
      })
   })
   .catch(err => console.log(err));
