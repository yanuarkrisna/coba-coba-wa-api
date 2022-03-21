//import modul ato library dulu
const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const {body, validationResult} = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const { phoneNumberFormatter } = require('./helpers/formatter');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(fileUpload({
   debug: true 
}));

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: __dirname
    });
});

const client = new Client({ 
    puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // <- this one doesn't works in Windows
          '--disable-gpu'
        ],
    }, 
    session: sessionCfg
 });

client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('pong');
    } else if (msg.body == 'Good morning') {
        msg.reply('Selamat pagi');
    }
});

client.initialize();

//socket.io
io.on('connection', function(socket){
    socket.emit('message', 'Connecting...');
    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', 'QR Code received, scan bruh plisss');
        });
    });
    
    client.on('ready', () => {
         socket.emit('ready', 'Whatsapp is Ready Bruh!!');
         socket.emit('message', 'Whatsapp is Ready Bruh!!');
    });

    client.on('authenticated', (session) => {
        socket.emit('authenticated', 'Whatsapp is ter autentifikasi Bruh!!');
        socket.emit('message', 'Whatsapp is ter autentifikasi Bruh!!');
        console.log('AUTHENTICATED', session);
        sessionCfg = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
            if (err) {
                console.error(err);
            }
        });
    });
});

const checkRegisteredNumber = async function(number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
}

// kirim pesan
app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
], async (req,res) => {
    const errors = validationResult(req).formatWith(({ msg }) => {
        return msg;
    }); //untuk validasi input

    if (!errors.isEmpty()){
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }
    const number = phoneNumberFormatter(req.body.number); //ambil nomor dari body html
    const message = req.body.message; // ambil pesan
    const isRegisteredNumber = await checkRegisteredNumber(number);

    if (!isRegisteredNumber) {
        return res.status(422).json({
            status: false,
            message: 'Nomormu belum terdaftar bruh'
        });
    }
    
    //bentuk dasar utk mengirim pesan
    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});

//kirim pesan media
app.post('/send-media', async (req,res) => {
    const number = phoneNumberFormatter(req.body.number); //ambil nomor dari body html
    const caption = req.body.caption; // ambil pesan
    const fileUrl = req.body.file;

    //const media = MessageMedia.fromFilePath('./cth.jpg')
    //const file = req.files.file;
    
    //bentuk dasar utk mengirim pesan
    let mimetype;
    const attachment = await axios.get(fileUrl, 
        {responseType: 'arraybuffer'}).then(
        response => {
            mimetype = response.headers['content-type'];
            return response.data.toString('base64');
        });

    const media = new MessageMedia(mimetype, attachment, 'Media');
    client.sendMessage(number, media, {
        caption: caption
    }).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});


server.listen(8000, function(){
    console.log('App running on *:' + 8000);
});