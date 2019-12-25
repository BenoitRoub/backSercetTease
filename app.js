const express = require("express");

const app = express();

var http = require("http").createServer(app);
var io = require("socket.io")(http);

require("dotenv/config");

// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;

//MIDLEWARE
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
	res.send("Voici votre mission");
});

////
var playersByRoom = { Room1: {}, Room2: {} };
var roomByName = {
	Room2: { name: "Room2", password: "Test" },
	Room1: { name: "Room1", password: "Test" }
};

const sendPlayersList = (playersByRoom, room, socket) => {
	socket.emit(
		"player:list",
		Object.values(playersByRoom[room]).map(player => ({
			name: player.name,
			id: player.id,
			ready: player.ready
		}))
	);
};
////
//NameSpace global pour connexion à la partie
io.on("connection", socket => {
	socket.emit(
		"room:getAll",
		Object.values(roomByName).map(room => room.name)
	);

	socket.on("Add Room", room => {
		if (roomByName[room.name]) {
			socket.emit("room:createError");
		} else {
			roomByName[room.name] = room;
			playersByRoom[room.name] = {};
			io.emit(
				"room:getAll",
				Object.values(roomByName).map(room => room.name)
			);
		}
	});

	socket.on("room:tryConnection", room => {
		socket.emit("room:passwordRequest", room);
	});

	socket.on("room:disconnect", () => {
		let room = Object.values(socket.rooms)[1];
		if (playersByRoom[room][socket.id]) {
			delete playersByRoom[room][socket.id];
		}
		socket.leave(room);
	});

	socket.on("room:tryPassword", room => {
		if (room.password === roomByName[room.name].password) {
			socket.join(room.name, () => {
				let room = Object.values(socket.rooms)[1];

				socket.on("player:getList", () => {
					sendPlayersList(playersByRoom, room, socket);
				});

				socket.on("player:delete", () => {
					delete playersByRoom[room][socket.id];
					sendPlayersList(playersByRoom, room, io.to(room));
				});

				socket.on("player:readyAction", readyBoolean => {
					playersByRoom[room][socket.id].ready = readyBoolean;
					sendPlayersList(playersByRoom, room, io.to(room));
				});
				socket.on("user:add", user => {
					if (
						Object.values(playersByRoom[user.room])
							.map(player => player.name)
							.includes(user.name)
					) {
						socket.emit("user:alreadyExists");
					} else {
						playersByRoom[user.room][socket.id] = {
							...user,
							id: socket.id
						};
						io.to(room).emit("alert:newUser");
						sendPlayersList(playersByRoom, room, io.to(room));
						socket.emit("game:enter");
					}
				});
			});
			socket.emit("room:connected", room.name);
		} else socket.emit("room:connectionError");
	});
});

// var players = [];
// var score = [0, 0];
// var actuality = [];

// room.on("connection", socket => {
// 	players.push({
// 		id: socket.id,
// 		username: socket.handshake.query["username"]
// 	});

// 	io.of("Dert").emit("New Player", players);

// 	room.to(`${socket.id}`).emit("SelfId", socket.id);

// 	socket.on("Actualize Player List", () => {
// 		io.of("Dert").emit("New Player", players);
// 	});

// 	socket.on("Player Selected After Succes", socket => {
// 		io.of("Dert").clients((err, client) => console.log(client));

// 		room.to(`${socket.playerSuffer.id}`).emit(
// 			"Alert",
// 			`Vous devez boire 6 gorgé sous la surveillance de ${socket.judge.username}`
// 		);

// 		room.to(`${socket.judge.id}`).emit(
// 			"Alert",
// 			`Vous êtes le juge pour ${socket.playerSuffer.username}`
// 		);
// 	});

// 	socket.on("Succes Mission", socket => {
// 		score[socket.team] += socket.rewardPoint;

// 		if (score[socket.team] > 300) {
// 			io.of("Dert").emit("Alert", `team ${socket.team} win`);
// 		} else io.of("Dert").emit("New Score", score);
// 	});

// 	socket.on("New Actuality", socket => {
// 		actuality.unshift({ text: socket.text, idPlayer: socket.idPlayer });
// 		io.of("Dert").emit("New Actuality", actuality);
// 	});

// 	socket.on("Delete Actuality", socket => {
// 		for (let id in actuality) {
// 			if (actuality[id].idPlayer === socket) {
// 				actuality.splice(id - 1, 1);
// 			}
// 		}
// 		io.of("Dert").emit("New Actuality", actuality);
// 	});

// 	socket.on("Spotted Mission", socket => {
// 		for (let id in actuality) {
// 			if (actuality[id].idPlayer === socket.mission.idPlayer) {
// 				actuality.splice(id - 1, 1);
// 			}
// 		}
// 		actuality.unshift({ text: socket.mission.textSpotted });
// 		io.of("Dert").emit("New Actuality", actuality);

// 		room.to(`${socket.mission.idPlayer}`).emit(
// 			"Alert",
// 			`Vous devez boire 6 gorgé sous la surveillance de ${socket.selfId}`
// 		);

// 		room.to(`${socket.selfId}`).emit(
// 			"Alert",
// 			`Vous êtes le juge pour ${socket.mission.idPlayer}`
// 		);
// 	});

// 	socket.on("Alert", socket => {
// 		room.to(`${socket.idPlayer}`).emit("Alert", socket.alert);
// 	});
// });

//LISTEN
http.listen(port, () => console.log(port));
