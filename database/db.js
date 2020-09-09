var mongoose = require('mongoose');
var dbURI = 'mongodb://mongoservice:27017/secureapi';

// Create the database connection 
function connect(cb) {
    mongoose.connect(dbURI, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true
    });
    var db = mongoose.connection;
    db.on('error', function (err) {
        console.log('Mongoose default connection error: ' + err);
        process.exit(1);
    });
    db.on('disconnected', function () {
        console.log('Mongoose default connection disconnected');
    });
    db.once('open', function () {
        console.log('Mongoose default connection open to ' + dbURI);
        cb();
    });
};

// If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function () {
    mongoose.connection.close(function () {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

module.exports.connect = function (cb) { connect(cb); };
module.exports.mongoose = mongoose;