const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Crea el modelo de dato para almacenar en una coleccion en mongoDB
const postSchema = new Schema({
   title: {
      type: String,
      required: true
   },
   imageUrl: {
      type: String,
      required: true
   },
   content: {
      type: String,
      required: true
   },
   creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
   }
},
   { timestamps: true } // Especifica que los campos createdAt y editedAt deben ser creados 
);

module.exports = mongoose.model('Post', postSchema);