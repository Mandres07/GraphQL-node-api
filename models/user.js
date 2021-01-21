const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Crea el modelo de dato para almacenar en una coleccion en mongoDB
const userSchema = new Schema({
   email: {
      type: String,
      required: true
   },
   password: {
      type: String,
      required: true
   },
   name: {
      type: String,
      required: true
   },
   status: {
      type: String,
      default: 'I am new!' // define un valor por defecto al crear un objeto User
   },
   posts: [{
      type: Schema.Types.ObjectId,
      ref: 'Post' // define a mongoDB que este campo es una referencia a la coleccion de Posts
   }]
},
   { timestamps: true } // Especifica que los campos createdAt y editedAt deben ser creados 
);

module.exports = mongoose.model('User', userSchema);