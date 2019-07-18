/*
 * @Description: 添加socket更多功能
 * @Author: Rockywu <wjl19890427@hotmail.com>
 * @Date: 2019-06-11 14:55:26
 * @LastEditors: Rockywu <wjl19890427@hotmail.com>
 * @LastEditTime: 2019-06-13 16:28:35
 */

let http = require('http');
let express	= require('express');
let fs = require('fs');
let io = require('socket.io');
let crypto = require('crypto');
let app = express();
let staticDir = express.static;
let server = http.createServer(app);

/**
 * 分为主动和被动两种同步信息状态
 * data.type
 * 1: 发起主动状态请求
 * 2: 响应主动状态请求
 */
const SOCKET_SYNC_STATE = 'SOCKET_SYNC_STATE'; 
const SOCKET_SET_STATE = 'SOCKET_SET_STATE'; //设置信息
const SOCKET_SYNC_PPT_INFOS = 'SOCKET_SYNC_PPT_INFOS'; //同步已经注册的所有PPT信息，支持主动和被动
const SOCKET_CREATE_PPT = 'SOCKET_CREATE_PPT'; //注册ppt

/**
 * 启动op对象和expres使用同一端口进行服务
 */
io = io(server);

let opts = {
	port: process.env.PORT || 1948,
	baseDir : __dirname + '/../../'
};

let registers = {}; //用于缓存所有注册的ppt连接

io.on( 'connection', function( socket ) {
	

	socket.on(SOCKET_CREATE_PPT, function(data) {
		//注册ppt信息
		if(data.socketId && data.name) {
			registers[data.socketId] = data;
			//发送更新socket
			socket.broadcast.emit(SOCKET_SYNC_PPT_INFOS, {
				payLoad: registers,
				type: 2
			});
		}
		console.log(SOCKET_CREATE_PPT, registers)
	})
	
	socket.on(SOCKET_SYNC_STATE, function(data) {
		console.log(SOCKET_SYNC_STATE, data)
		socket.broadcast.emit(SOCKET_SYNC_STATE, data)
	})

	socket.on(SOCKET_SET_STATE, function(data) {
		console.log(SOCKET_SET_STATE, data)
		socket.broadcast.emit(SOCKET_SET_STATE, data)
	})

	socket.on(SOCKET_SYNC_PPT_INFOS, function(data) {
		console.log(SOCKET_SYNC_PPT_INFOS, data)
		if(data.type === 1) {
			io.sockets.emit(SOCKET_SYNC_PPT_INFOS, {
				payLoad: registers,
				type: 2
			});
		}
	})

});

[ 'css', 'js', 'plugin', 'lib' ].forEach(function(dir) {
	app.use('/' + dir, staticDir(opts.baseDir + dir));
});

app.get("/", function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/html'});

	var stream = fs.createReadStream(opts.baseDir + '/index.html');
	stream.on('error', function( error ) {
		res.write('<style>body{font-family: sans-serif;}</style><h2>reveal.js multiplex server.</h2><a href="/token">Generate token</a>');
		res.end();
	});
	stream.on('readable', function() {
		stream.pipe(res);
	});
});

app.get("/token", function(req,res) {
	var ts = new Date().getTime();
	var rand = Math.floor(Math.random()*9999999);
	var secret = ts.toString() + rand.toString();
	res.send({secret: secret, socketId: createHash(secret)});
});

var createHash = function(secret) {
	var cipher = crypto.createCipher('blowfish', secret);
	return(cipher.final('hex'));
};

// Actually listen
server.listen( opts.port || null );

var brown = '\033[33m',
	green = '\033[32m',
	reset = '\033[0m';

console.log( brown + "reveal.js:" + reset + " Multiplex running on port " + green + opts.port + reset );