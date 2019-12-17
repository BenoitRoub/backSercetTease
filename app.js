const express = require('express');

const app = express();

var http = require('http').createServer(app);
var io = require('socket.io')(http);

require('dotenv/config');



// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;


//MIDLEWARE 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.get('/', (req, res) =>{
	res.send('Voici votre mission')
})


//NameSpace global pour connexion à la partie

io.on("connection", socket => {

	io.emit('newRoom', ["Salut", "Dert"])

	socket.on('disconnect', function () {

	    console.log('disocnnect')
  });
})



//Namespace Pour Chaque Partie
const room = io.of("/Dert")

var players = []
var score = [0,0]
var actuality = []

room.on("connection", socket => {
	
	players.push({
		id: socket.id,
		username: socket.handshake.query['username'],
	})

	io.of('Dert').emit("New Player", players)
	
	room.to(`${socket.id}`).emit("SelfId", socket.id)

	socket.on('Actualize Player List', () => {
		io.of('Dert').emit("New Player", players)
	})

	socket.on('Player Selected After Succes', socket => {

		io.of('Dert').clients((err, client) => console.log(client))

		room.to(`${socket.playerSuffer.id}`).emit('Alert', `Vous devez boire 6 gorgé sous la surveillance de ${socket.judge.username}`)

		room.to(`${socket.judge.id}`).emit('Alert', `Vous êtes le juge pour ${socket.playerSuffer.username}`)

	})

	socket.on('Succes Mission', socket => {

		score[socket.team] += socket.rewardPoint

		if (score[socket.team] > 300) {
			io.of('Dert').emit("Alert", `team ${socket.team} win`)
		}
		else io.of('Dert').emit("New Score", score)

	})

	socket.on('New Actuality', socket => {

		actuality.unshift({text: socket.text, idPlayer: socket.idPlayer})
		io.of('Dert').emit('New Actuality', actuality)

	})

	socket.on('Delete Actuality', socket => {

		for (let id in actuality) {
			if (actuality[id].idPlayer === socket) {
				actuality.splice(id - 1, 1)
			}
		}
		io.of('Dert').emit('New Actuality', actuality)

	})

	socket.on('Spotted Mission', socket => {
		
		for (let id in actuality) {
			if (actuality[id].idPlayer === socket.mission.idPlayer) {
				actuality.splice(id - 1, 1)
			}
		}
		actuality.unshift({text: socket.mission.textSpotted})
		io.of('Dert').emit('New Actuality', actuality)

		room.to(`${socket.mission.idPlayer}`).emit('Alert', `Vous devez boire 6 gorgé sous la surveillance de ${socket.selfId}`)

		room.to(`${socket.selfId}`).emit('Alert', `Vous êtes le juge pour ${socket.mission.idPlayer}`)
	})

	socket.on('Alert', socket => {
		room.to(`${socket.idPlayer}`).emit('Alert', socket.alert)
	})
})




//LISTEN
http.listen(port);