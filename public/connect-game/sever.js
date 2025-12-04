// --- Simple WebSocket Server with Join Code / Shared Text ---

const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 8080 });

// Change this to anything you want:
const JOIN_CODE = "1234";

// Stores all connected clients in the same room
let clients = [];
let sharedText = ""; // Text that everyone sees

server.on("connection", (socket) => {
    console.log("A user connected.");

    socket.on("message", (data) => {
        let msg = JSON.parse(data);

        // Handle join request
        if (msg.type === "join") {
            if (msg.code !== JOIN_CODE) {
                socket.send(JSON.stringify({ type: "error", message: "Invalid join code." }));
                socket.close();
                return;
            }

            clients.push(socket);
            socket.send(JSON.stringify({ type: "init", text: sharedText }));
            return;
        }

        // Handle text update
        if (msg.type === "updateText") {
            sharedText = msg.text;

            // Broadcast update to all clients
            clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: "updateText", text: sharedText }));
                }
            });
        }
    });

    socket.on("close", () => {
        clients = clients.filter((c) => c !== socket);
    });
});

console.log("Server running on ws://localhost:8080");
