const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { clearImage } = require('./util/file');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { graphqlHTTP } = require('express-graphql');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const auth = require('./middleware/auth');

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
   // Para que el request de OPTIONS que se manda por defecto no falle, cada ve que entra ese request solo retorna statusCode de 200 sin entrar al end point de graphQL
   if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
   }
   next();
});

app.use(auth);

app.put('/post-image', (req, res, next) => {
   if (!req.isAuth) {
      throw new Error('Not authenticated.');
   }
   if (!req.file) {
      return res.status(200).json({ message: 'No file provided.' });
   }
   if (req.body.oldPath) {
      clearImage(req.body.oldPath);
   }
   return res.status(201).json({ message: 'File Stored.', filePath: req.file.path.replace("\\", "/") });
});

app.use('/graphql', graphqlHTTP({
   schema: graphqlSchema,
   rootValue: graphqlResolver,
   graphiql: true,
   customFormatErrorFn(err) {
      if (!err.originalError) {
         return err;
      }
      const data = err.originalError.data;
      const message = err.message || 'An error ocurred.';
      const code = err.originalError.code || 500;
      return {
         message: message,
         status: code,
         data: data
      }
   }
}));

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
      app.listen(8080);
   })
   .catch(err => console.log(err));

