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

const role = [1, 1, 1, 2, 3, 1, 1, 2, 1, 1, 3, 1, 2];
var playersByRoom = {
	Room1: {},
	Room2: {}
};
var roomByName = {
	Room2: {
		name: "Room2",
		password: "Test"
	},
	Room1: { name: "Room1", password: "Test" }
};

const sendPlayersList = (playersByRoom, room, socket) => {
	socket.emit(
		"player:list",
		Object.values(playersByRoom[room]).map(player => player)
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
							id: socket.id,
							score: 0
						};
						io.to(room).emit("alert:newUser");
						sendPlayersList(playersByRoom, room, io.to(room));
						socket.emit("game:enter", { username: user.name });
					}
				});

				socket.on("room:launch", () => {
					if (!roomByName[room].statusLaunch) {
						roomByName[room].statusLaunch = true;
						io.to(room).emit("game:launch", true);
					}
				});

				socket.on("room:getStatusLaunch", () => {
					io.to(room).emit(
						"game:launch",
						roomByName[room].statusLaunch
					);
				});

				// PARTIE INGAME DES ACTIONS

				socket.on("timer:end", params => {
					if (params.round !== roomByName[room].round) {
						roomByName[room].round = params.round;

						var newRole = role.splice(playersByRoom[room].length);
						Object.values(playersByRoom[room]).forEach(player => {
							var random = Math.floor(
								Math.random() * Math.floor(newRole.length)
							);
							playersByRoom[player].role = newRole[random];
							newRole = newRole.splice(random, 1);
						});
						console.log(playersByRoom[room]);
						sendPlayersList(playersByRoom, room, socket);
						io.to(room).emit("timer:update", 10 * 60);
					}
				});

				socket.on("player:vote", params => {
					if (params.idTarget) {
						playersByRoom[room][params.idTarget] = {
							...playersByRoom[room][params.idTarget],
							score:
								playersByRoom[room][params.idTarget].score + 1
						};
						sendPlayersList(playersByRoom, room, socket);
					}
				});

				//
				//
				//
				//
				//
				//

				// socket.on("Player Selected After Succes", props => {
				// 	io.to(`${props.playerSuffer.id}`).emit(
				// 		"Alert",
				// 		`Vous devez boire 6 gorgé sous la surveillance de ${props.judge.username}`
				// 	);

				// 	io.to(`${props.judge.id}`).emit(
				// 		"Alert",
				// 		`Vous êtes le juge pour ${props.playerSuffer.username}`
				// 	);
				// });

				// socket.on("Succes Mission", props => {
				// 	roomByName[room].team[props.team] += props.rewardPoint;

				// 	if (roomByName[room].team[props.team] > 300) {
				// 		io.to(room).emit("Alert", `team ${props.team} win`);
				// 	} else io.to(room).emit("New Score", roomByName[room].team);

				// 	roomByName[room].actuality.unshift({
				// 		text: `team ${props.team} marque ${props.rewardPoint} points`,
				// 		type: "succesMission"
				// 	});
				// 	io.to(room).emit(
				// 		"New Actuality",
				// 		roomByName[room].actuality
				// 	);
				// 	console.log(roomByName[room].actuality);
				// });

				// socket.on("New Actuality", props => {
				// 	roomByName[room].actuality.unshift({
				// 		text: props.text,
				// 		idPlayer: props.idPlayer,
				// 		type: props.type
				// 	});
				// 	io.to(room).emit(
				// 		"New Actuality",
				// 		roomByName[room].actualityrs
				// 	);
				// });

				// socket.on("Delete Actuality", props => {
				// 	console.log(roomByName[room].actuality);
				// 	for (let id in roomByName[room].actuality) {
				// 		if (roomByName[room].actuality[id].idPlayer === props) {
				// 			roomByName[room].actuality.splice(id, 1);
				// 		}
				// 	}
				// 	console.log(props);
				// 	console.log(roomByName[room].actuality);
				// 	io.to(room).emit(
				// 		"New Actuality",
				// 		roomByName[room].actuality
				// 	);
				// });

				// socket.on("Spotted Mission", props => {
				// 	for (let id in roomByName[room].actuality) {
				// 		if (
				// 			roomByName[room].actuality[id].idPlayer ===
				// 			props.mission.idPlayer
				// 		) {
				// 			roomByName[room].actuality.splice(id, 1);
				// 		}
				// 	}
				// 	roomByName[room].actuality.unshift({
				// 		text: props.mission.textSpotted,
				// 		type: "spottedMission"
				// 	});
				// 	io.to(room).emit(
				// 		"New Actuality",
				// 		roomByName[room].actuality
				// 	);

				// 	io.to(`${props.mission.idPlayer}`).emit(
				// 		"Alert",
				// 		`Vous devez boire 6 gorgé sous la surveillance de ${props.selfId}`
				// 	);

				// 	io.to(`${props.selfId}`).emit(
				// 		"Alert",
				// 		`Vous êtes le juge pour ${props.mission.idPlayer}`
				// 	);
				// });

				// socket.on("Alert", props => {
				// 	io.to(`${props.idPlayer}`).emit("Alert", props.alert);
				// });
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
