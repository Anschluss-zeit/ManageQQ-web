var express = require('express');
var app = express();
var options = require('./config');
var nunjucks = require('nunjucks');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false })
var md5 = require('md5')
var cookieParser = require('cookie-parser')
const { MongoClient } = require('mongodb');

var url = options.options.db;
var name = options.options.dbname;
const client = new MongoClient(url);
var db;
var collu;

app.use('/css', express.static('views/css'));
app.use('/image', express.static('views/image'));
app.use('/fonts', express.static('views/fonts'));
app.use('/less', express.static('views/less'));
app.use('/scss', express.static('views/scss'));
app.use(cookieParser())
 
async function init() {
    await client.connect();
    db = client.db(name);
    collu = db.collection("user");
}

async function addUser(uname, password, mail) {
    await collu.insertOne({"_id": uname, "password": md5(password), "email": mail});
}

async function findUser(uname) {
    return await collu.findOne({"_id": uname});
}

async function findUserByEmail(email) {
    return await collu.findOne({"email": email});
}

nunjucks.configure('views', {
    autoescape: true,
    express: app
});

app.get('/check', function (req, res) {
    res.render("default.html");
})

app.get('/login', function (req, res) {
    res.render("login.html");
})

app.post('/login', urlencodedParser, async function (req,res){
    var uname=req.body.uname;
    var password=md5(req.body.password);
    console.log(password);
    var response = {
        "code": 200,
    }
    var user = await findUser(uname);
    if(!user) {
        user = findUserByEmail(uname);
    }
    if(!user) {
        response.code = 20001;
        res.end(JSON.stringify(response));
        return;
    }
    var passw = user.password;
    if (password !== passw) {
        response.code = 20002;
        res.end(JSON.stringify(response));
        return;
    }
    res.cookie("uname", uname);
    res.cookie("password", passw);
    res.end(JSON.stringify(response));
})

app.get('/register', function (req, res) {
    res.render("register.html");
})

app.post('/register', urlencodedParser, async function (req, res) {
    var uname=req.body.uname;
    var password=req.body.password;
    var email=req.body.email;
    var response = {
        "code": 200,
    }
    if(await findUser(uname)){
        response.code = 10001;
    }
    else if(await findUserByEmail(email)){
        response.code = 10002;
    }
    else{
        await addUser(uname,password,email);
        res.cookie("uname", uname);
        res.cookie("password", md5(password));
    }
    res.render("after_reg.html",{res: response});
}) 

app.get('/', async function (req,res) {
    var uname = req.cookies.uname;
    var pass = req.cookies.password;
    if(uname && pass){
        var user = await findUser(uname);
        if(user && (pass === user.password)){
            res.render("index.html");
            return;
        }
    }
    res.redirect("/login");
})

var server = app.listen(options.options.port, async function () {
    await init();
    var port = server.address().port
    console.log("Server is running at localhost:%s", port)
})